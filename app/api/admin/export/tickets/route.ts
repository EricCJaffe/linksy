import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { convertToCSV } from '@/lib/utils/csv'

/**
 * GET /api/admin/export/tickets
 * Export tickets to CSV with date range filtering
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const status = searchParams.get('status')

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_tickets')
    .select(`
      ticket_number, status, client_name, client_email, client_phone,
      description_of_need, source, sla_due_at, created_at, updated_at,
      provider:linksy_providers(name), need:linksy_needs(name)
    `)
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)
  if (status && status !== 'all') query = query.eq('status', status)

  const { data: tickets, error: fetchError } = await query

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const flat = (tickets || []).map((t: any) => ({
    ticket_number: t.ticket_number,
    status: t.status,
    client_name: t.client_name,
    client_email: t.client_email,
    client_phone: t.client_phone,
    provider_name: t.provider?.name,
    need: t.need?.name,
    description: t.description_of_need,
    source: t.source,
    sla_due_at: t.sla_due_at,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }))

  const csv = convertToCSV(flat, [
    { key: 'ticket_number', header: 'Ticket Number' },
    { key: 'status', header: 'Status' },
    { key: 'client_name', header: 'Client Name' },
    { key: 'client_email', header: 'Client Email' },
    { key: 'client_phone', header: 'Client Phone' },
    { key: 'provider_name', header: 'Provider' },
    { key: 'need', header: 'Need' },
    { key: 'description', header: 'Description' },
    { key: 'source', header: 'Source' },
    { key: 'sla_due_at', header: 'SLA Due' },
    { key: 'created_at', header: 'Created' },
    { key: 'updated_at', header: 'Updated' },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tickets-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
