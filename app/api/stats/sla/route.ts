import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/stats/sla
 * Returns SLA compliance statistics for the dashboard
 */
export async function GET(_request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const supabase = await createServiceClient()
  const now = new Date().toISOString()

  // Get all pending tickets with SLA info
  const { data: pendingTickets } = await supabase
    .from('linksy_tickets')
    .select('id, ticket_number, client_name, sla_due_at, created_at, provider_id, linksy_providers!left(name)')
    .eq('status', 'pending')
    .order('sla_due_at', { ascending: true })

  const tickets = pendingTickets || []

  // Categorize by SLA status
  const approaching: any[] = []
  const overdue: any[] = []
  const onTrack: any[] = []

  for (const t of tickets) {
    if (!t.sla_due_at) continue
    const dueAt = new Date(t.sla_due_at)
    const nowDate = new Date()
    const hoursRemaining = (dueAt.getTime() - nowDate.getTime()) / (1000 * 60 * 60)

    const ticket = {
      id: t.id,
      ticket_number: t.ticket_number,
      client_name: t.client_name,
      sla_due_at: t.sla_due_at,
      created_at: t.created_at,
      provider_name: (t as any).linksy_providers?.name || null,
      hours_remaining: Math.round(hoursRemaining * 10) / 10,
    }

    if (hoursRemaining < 0) {
      overdue.push(ticket)
    } else if (hoursRemaining < 12) {
      approaching.push(ticket)
    } else {
      onTrack.push(ticket)
    }
  }

  // Calculate compliance rate (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: resolvedTickets } = await supabase
    .from('linksy_tickets')
    .select('created_at, updated_at, sla_due_at')
    .neq('status', 'pending')
    .gte('created_at', thirtyDaysAgo)

  let metSla = 0
  let totalWithSla = 0
  for (const t of resolvedTickets || []) {
    if (t.sla_due_at && t.updated_at) {
      totalWithSla++
      if (new Date(t.updated_at) <= new Date(t.sla_due_at)) {
        metSla++
      }
    }
  }

  const complianceRate = totalWithSla > 0 ? Math.round((metSla / totalWithSla) * 100) : 100

  return NextResponse.json({
    overdue,
    approaching,
    onTrack,
    summary: {
      totalPending: tickets.length,
      overdueCount: overdue.length,
      approachingCount: approaching.length,
      onTrackCount: onTrack.length,
      complianceRate,
      metSla,
      totalResolved: totalWithSla,
    },
  })
}
