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
  const includeTest = searchParams.get('include_test') === 'true'
  const excludeBlankService = searchParams.get('exclude_blank_service') === 'true'
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const supabase = await createServiceClient()

  // Build ticket query with optional legacy filter, excluding test referrals unless toggled
  let ticketsQuery = supabase.from('linksy_tickets').select('status, need_id', { count: 'exact' })
  if (!includeLegacy) {
    ticketsQuery = ticketsQuery.is('legacy_id', null)
  }
  if (!includeTest) {
    ticketsQuery = ticketsQuery.or('is_test.is.null,is_test.eq.false')
  }
  if (excludeBlankService) {
    ticketsQuery = ticketsQuery.not('need_id', 'is', null)
  }
  if (dateFrom) {
    ticketsQuery = ticketsQuery.gte('created_at', dateFrom)
  }
  if (dateTo) {
    // Add time to include the entire end date
    ticketsQuery = ticketsQuery.lte('created_at', `${dateTo}T23:59:59.999Z`)
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
      .eq('is_active', true),

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

  // Fallback if is_test column doesn't exist yet
  let ticketsData = ticketsStats.data
  if (ticketsStats.error && ticketsStats.error.message.includes('is_test')) {
    let retryQuery = supabase.from('linksy_tickets').select('status, need_id', { count: 'exact' })
    if (!includeLegacy) {
      retryQuery = retryQuery.is('legacy_id', null)
    }
    const retry = await retryQuery
    ticketsData = retry.data
  }

  // Process ticket stats
  const totalTickets = ticketsData?.length || 0
  const openTickets = ticketsData?.filter(t => ['pending', 'in_process', 'transferred_pending'].includes(t.status)).length || 0
  const closedTickets = ticketsData?.filter(t =>
    ['customer_need_addressed', 'unable_to_assist', 'client_unresponsive',
     'wrong_organization_referred', 'outside_of_scope', 'client_not_eligible',
     'transferred_another_provider'].includes(t.status)
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
