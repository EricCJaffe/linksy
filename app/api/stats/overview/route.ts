import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/stats/overview
 * Get overview statistics for the platform
 */
export async function GET(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const includeLegacy = searchParams.get('includeLegacy') === 'true'

  const supabase = await createServiceClient()

  // Build ticket query with optional legacy filter
  let ticketsQuery = supabase.from('linksy_tickets').select('status', { count: 'exact' })
  if (!includeLegacy) {
    ticketsQuery = ticketsQuery.is('legacy_id', null)
  }

  // Fetch all stats in parallel
  const [
    providersCount,
    ticketsStats,
    supportTicketsStats,
    needsCount,
  ] = await Promise.all([
    // Total providers
    supabase
      .from('linksy_providers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Tickets stats
    ticketsQuery,

    // Support tickets stats
    supabase
      .from('linksy_support_tickets')
      .select('status', { count: 'exact' }),

    // Total needs
    supabase
      .from('linksy_needs')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  // Process ticket stats
  const totalTickets = ticketsStats.data?.length || 0
  const openTickets = ticketsStats.data?.filter(t => t.status === 'pending').length || 0
  const closedTickets = ticketsStats.data?.filter(t =>
    ['customer_need_addressed', 'unable_to_assist', 'client_unresponsive',
     'wrong_organization_referred', 'outside_of_scope', 'client_not_eligible'].includes(t.status)
  ).length || 0

  // Process support ticket stats
  const totalSupportTickets = supportTicketsStats.data?.length || 0
  const openSupportTickets = supportTicketsStats.data?.filter(t =>
    t.status === 'open' || t.status === 'in_progress'
  ).length || 0
  const closedSupportTickets = supportTicketsStats.data?.filter(t =>
    t.status === 'resolved' || t.status === 'closed'
  ).length || 0

  return NextResponse.json({
    providers: {
      total: providersCount.count || 0,
    },
    referrals: {
      total: totalTickets,
      open: openTickets,
      closed: closedTickets,
    },
    supportTickets: {
      total: totalSupportTickets,
      open: openSupportTickets,
      closed: closedSupportTickets,
    },
    needs: {
      total: needsCount.count || 0,
    },
  })
}
