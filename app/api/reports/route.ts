import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/reports
 * Role-based reports API - returns data scoped to user's role and access level
 *
 * Query params:
 * - type: 'referrals' | 'search' | 'reassignments'
 * - includeLegacy: 'true' | 'false' (for referrals only)
 *
 * Access levels:
 * - site_admin: See all system-wide data
 * - provider_admin (parent_admin): See their organization's data (all accessible providers)
 * - provider_user (self): See only their personal data (tickets assigned to them)
 */
export async function GET(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const reportType = searchParams.get('type') || 'referrals'
  const includeLegacy = searchParams.get('includeLegacy') === 'true'

  const supabase = await createServiceClient()

  // Determine data scope based on role
  let dataScope: 'all' | 'providers' | 'personal' = 'personal'
  let providerIds: string[] = []
  let accessLevel: 'site_admin' | 'parent_admin' | 'self' = 'self'

  if (auth.isSiteAdmin) {
    dataScope = 'all'
    accessLevel = 'site_admin'
  } else {
    // Check for provider access
    const { data: providerContacts } = await supabase
      .from('linksy_provider_contacts')
      .select('provider_id, contact_type')
      .eq('user_id', auth.user.id)
      .eq('status', 'active')

    if (providerContacts && providerContacts.length > 0) {
      // Get all accessible provider IDs (including children for admins)
      const directProviderIds = providerContacts.map(c => c.provider_id)
      const isAdminTypes = ['provider_admin', 'org_admin']
      const isProviderAdmin = providerContacts.some(c => isAdminTypes.includes(c.contact_type))

      if (isProviderAdmin) {
        // Provider admins see org-wide data (including children)
        const accessibleIds = new Set(directProviderIds)

        // Add children for admin contacts
        for (const contact of providerContacts) {
          if (isAdminTypes.includes(contact.contact_type)) {
            const { data: children } = await supabase
              .from('linksy_providers')
              .select('id')
              .eq('parent_provider_id', contact.provider_id)

            if (children) {
              children.forEach(child => accessibleIds.add(child.id))
            }
          }
        }

        providerIds = Array.from(accessibleIds)
        dataScope = 'providers'
        accessLevel = 'parent_admin'
      } else {
        // Regular provider users see only personal data
        providerIds = directProviderIds
        dataScope = 'personal'
        accessLevel = 'self'
      }
    }
  }

  // Route to appropriate report handler
  switch (reportType) {
    case 'referrals':
      return handleReferralsReport(supabase, dataScope, providerIds, auth.user.id, includeLegacy)

    case 'search':
      return handleSearchReport(supabase, dataScope, providerIds)

    case 'reassignments':
      // Only site admins can see reassignments
      if (!auth.isSiteAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return handleReassignmentsReport(supabase)

    default:
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }
}

async function handleReferralsReport(
  supabase: any,
  dataScope: string,
  providerIds: string[],
  userId: string,
  includeLegacy: boolean
) {
  // Build base query
  let ticketsQuery = supabase
    .from('linksy_tickets')
    .select(`
      id,
      status,
      provider_id,
      created_at,
      updated_at,
      assigned_to,
      need_category,
      source,
      provider:linksy_providers(id, name)
    `)

  // Filter by scope
  if (dataScope === 'providers') {
    ticketsQuery = ticketsQuery.in('provider_id', providerIds)
  } else if (dataScope === 'personal') {
    ticketsQuery = ticketsQuery.eq('assigned_to', userId)
  }

  // Filter by legacy flag (exclude imported_at IS NOT NULL if includeLegacy is false)
  if (!includeLegacy) {
    ticketsQuery = ticketsQuery.is('imported_at', null)
  }

  const { data: tickets, error } = await ticketsQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate data
  const referralsByStatus = aggregateByField(tickets, 'status')
  const referralsByCategory = aggregateByField(tickets, 'need_category')
  const referralsBySource = aggregateByField(tickets, 'source')
  const topReferrers = aggregateTopProviders(tickets)
  const monthlyTrends = aggregateMonthlyTrends(tickets)
  const recentActivity = calculateRecentActivity(tickets)
  const timeToResolution = calculateTimeToResolution(tickets)

  return NextResponse.json({
    referralsByStatus,
    referralsByCategory,
    referralsBySource,
    topReferrers,
    monthlyTrends,
    recentActivity,
    timeToResolution,
  })
}

async function handleSearchReport(
  supabase: any,
  dataScope: string,
  providerIds: string[]
) {
  // Build base query for search sessions
  let sessionsQuery = supabase
    .from('linksy_search_sessions')
    .select('*')

  // Filter by scope
  if (dataScope === 'providers') {
    // For provider users, filter by host_provider_id (widget embedded on their site)
    sessionsQuery = sessionsQuery.in('host_provider_id', providerIds)
  } else if (dataScope === 'personal') {
    // Personal search sessions don't make sense for individual provider staff
    // Return empty data
    return NextResponse.json({
      totalSessions: 0,
      sessionsLast30Days: 0,
      totalInteractions: 0,
      totalCrisisDetections: 0,
      monthlySearchTrend: [],
      interactionsByType: [],
      topProvidersByInteraction: [],
      crisisBreakdown: [],
      recentCrisisSessions: [],
      funnel: {
        totalSessions: 0,
        engagedSessions: 0,
        convertedSessions: 0,
        engagementRate: 0,
        conversionRate: 0,
        engagedConversionRate: 0,
      },
      topZipCodes: [],
    })
  }

  const { data: sessions, error } = await sessionsQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate search analytics
  const totalSessions = sessions.length
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const sessionsLast30Days = sessions.filter(
    (s: any) => new Date(s.created_at) >= thirtyDaysAgo
  ).length

  const totalCrisisDetections = sessions.filter((s: any) => s.is_crisis).length

  // Get interactions for these sessions
  let interactionsQuery = supabase
    .from('linksy_interactions')
    .select('*')
    .in('session_id', sessions.map((s: any) => s.id))

  const { data: interactions } = await interactionsQuery
  const totalInteractions = interactions?.length || 0

  // Aggregate interaction types
  const interactionsByType = aggregateByField(interactions || [], 'interaction_type')

  // Top providers by interaction
  const topProvidersByInteraction = await getTopProvidersByInteraction(
    supabase,
    sessions.map((s: any) => s.id)
  )

  // Crisis breakdown
  const crisisBreakdown = sessions
    .filter((s: any) => s.is_crisis && s.crisis_type)
    .reduce((acc: any[], s: any) => {
      const existing = acc.find((item: any) => item.type === s.crisis_type)
      if (existing) {
        existing.count++
      } else {
        acc.push({ type: s.crisis_type, count: 1 })
      }
      return acc
    }, [])
    .sort((a: any, b: any) => b.count - a.count)

  // Recent crisis sessions
  const recentCrisisSessions = sessions
    .filter((s: any) => s.is_crisis)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((s: any) => ({
      id: s.id,
      crisis_type: s.crisis_type,
      created_at: s.created_at,
    }))

  // Funnel metrics
  const engagedSessions = sessions.filter((s: any) =>
    s.services_clicked && s.services_clicked.length > 0
  ).length
  const convertedSessions = sessions.filter((s: any) => s.created_ticket).length

  const engagementRate = totalSessions > 0
    ? Math.round((engagedSessions / totalSessions) * 100)
    : 0
  const conversionRate = totalSessions > 0
    ? Math.round((convertedSessions / totalSessions) * 100)
    : 0
  const engagedConversionRate = engagedSessions > 0
    ? Math.round((convertedSessions / engagedSessions) * 100)
    : 0

  // Monthly search trend
  const monthlySearchTrend = aggregateMonthlyTrends(sessions)

  // Top zip codes
  const topZipCodes = sessions
    .filter((s: any) => s.zip_code_searched)
    .reduce((acc: any[], s: any) => {
      const existing = acc.find((item: any) => item.zip_code === s.zip_code_searched)
      if (existing) {
        existing.count++
      } else {
        acc.push({ zip_code: s.zip_code_searched, count: 1 })
      }
      return acc
    }, [])
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)

  return NextResponse.json({
    totalSessions,
    sessionsLast30Days,
    totalInteractions,
    totalCrisisDetections,
    monthlySearchTrend,
    interactionsByType,
    topProvidersByInteraction,
    crisisBreakdown,
    recentCrisisSessions,
    funnel: {
      totalSessions,
      engagedSessions,
      convertedSessions,
      engagementRate,
      conversionRate,
      engagedConversionRate,
    },
    topZipCodes,
  })
}

async function handleReassignmentsReport(supabase: any) {
  // Fetch reassignment events
  const { data: events, error } = await supabase
    .from('linksy_ticket_events')
    .select(`
      *,
      ticket:linksy_tickets(provider_id),
      from_provider:linksy_providers!from_provider_id(id, name),
      to_provider:linksy_providers!to_provider_id(id, name)
    `)
    .in('event_type', ['reassigned', 'forwarded'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate reassignment stats
  const totalReassignments = events.length
  const providerInitiated = events.filter((e: any) => e.event_type === 'forwarded').length
  const adminInitiated = events.filter((e: any) => e.event_type === 'reassigned').length

  // Count unique tickets that were reassigned
  const uniqueTickets = new Set(events.map((e: any) => e.ticket_id)).size
  const averageReassignmentsPerTicket = uniqueTickets > 0
    ? totalReassignments / uniqueTickets
    : 0

  // Top forwarding providers
  const forwardingCounts = new Map<string, { provider_id: string; provider_name: string; count: number }>()
  events
    .filter((e: any) => e.from_provider_id)
    .forEach((e: any) => {
      const key = e.from_provider_id
      if (forwardingCounts.has(key)) {
        forwardingCounts.get(key)!.count++
      } else {
        forwardingCounts.set(key, {
          provider_id: key,
          provider_name: (e as any).from_provider?.name || 'Unknown',
          count: 1,
        })
      }
    })

  const topForwardingProviders = Array.from(forwardingCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((p: any) => ({ ...p, forward_count: p.count }))

  // Top receiving providers
  const receivingCounts = new Map<string, { provider_id: string; provider_name: string; count: number }>()
  events
    .filter((e: any) => e.to_provider_id)
    .forEach((e: any) => {
      const key = e.to_provider_id
      if (receivingCounts.has(key)) {
        receivingCounts.get(key)!.count++
      } else {
        receivingCounts.set(key, {
          provider_id: key,
          provider_name: (e as any).to_provider?.name || 'Unknown',
          count: 1,
        })
      }
    })

  const topReceivingProviders = Array.from(receivingCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((p: any) => ({ ...p, receive_count: p.count }))

  // Reason breakdown
  const reasonBreakdown: Record<string, number> = {}
  events.forEach((e: any) => {
    const reason = e.reason || 'not_specified'
    reasonBreakdown[reason] = (reasonBreakdown[reason] || 0) + 1
  })

  return NextResponse.json({
    total_reassignments: totalReassignments,
    provider_initiated: providerInitiated,
    admin_initiated: adminInitiated,
    average_reassignments_per_ticket: averageReassignmentsPerTicket,
    top_forwarding_providers: topForwardingProviders,
    top_receiving_providers: topReceivingProviders,
    reason_breakdown: reasonBreakdown,
  })
}

// Helper functions
function aggregateByField(items: any[], field: string) {
  const counts = new Map<string, number>()
  items.forEach((item: any) => {
    const value = item[field] || 'unknown'
    counts.set(value, (counts.get(value) || 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([name, count]: [string, number]) => ({ [field === 'need_category' ? 'name' : field]: name, count }))
    .sort((a: any, b: any) => b.count - a.count)
}

function aggregateTopProviders(tickets: any[]) {
  const providerCounts = new Map<string, { id: string; name: string; count: number }>()
  tickets.forEach((ticket: any) => {
    if (ticket.provider) {
      const key = ticket.provider.id
      if (providerCounts.has(key)) {
        providerCounts.get(key)!.count++
      } else {
        providerCounts.set(key, {
          id: ticket.provider.id,
          name: ticket.provider.name,
          count: 1,
        })
      }
    }
  })
  return Array.from(providerCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function aggregateMonthlyTrends(items: any[]) {
  const monthCounts = new Map<string, number>()
  const now = new Date()

  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthCounts.set(key, 0)
  }

  // Count items by month
  items.forEach((item: any) => {
    const date = new Date(item.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (monthCounts.has(key)) {
      monthCounts.set(key, monthCounts.get(key)! + 1)
    }
  })

  return Array.from(monthCounts.entries())
    .map(([month, count]: [string, number]) => ({ month, count }))
}

function calculateRecentActivity(tickets: any[]) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const last30Days = tickets.filter(
    (t: any) => new Date(t.created_at) >= thirtyDaysAgo
  ).length

  return { last30Days }
}

function calculateTimeToResolution(tickets: any[]) {
  const resolvedTickets = tickets.filter((t: any) =>
    t.status !== 'pending' && t.updated_at
  )

  if (resolvedTickets.length === 0) {
    return {
      avgDays: null,
      totalResolved: 0,
      byStatus: [],
    }
  }

  // Calculate average days to resolution
  const totalDays = resolvedTickets.reduce((sum: number, ticket: any) => {
    const created = new Date(ticket.created_at).getTime()
    const resolved = new Date(ticket.updated_at).getTime()
    const days = (resolved - created) / (1000 * 60 * 60 * 24)
    return sum + days
  }, 0)

  const avgDays = Math.round(totalDays / resolvedTickets.length)

  // By status
  const byStatusMap = new Map<string, { sum: number; count: number }>()
  resolvedTickets.forEach((ticket: any) => {
    const created = new Date(ticket.created_at).getTime()
    const resolved = new Date(ticket.updated_at).getTime()
    const days = (resolved - created) / (1000 * 60 * 60 * 24)

    const existing = byStatusMap.get(ticket.status) || { sum: 0, count: 0 }
    existing.sum += days
    existing.count++
    byStatusMap.set(ticket.status, existing)
  })

  const byStatus = Array.from(byStatusMap.entries())
    .map(([status, { sum, count }]: [string, { sum: number; count: number }]) => ({
      status,
      avg_days: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    avgDays,
    totalResolved: resolvedTickets.length,
    byStatus,
  }
}

async function getTopProvidersByInteraction(supabase: any, sessionIds: string[]) {
  if (sessionIds.length === 0) return []

  const { data: interactions } = await supabase
    .from('linksy_interactions')
    .select('provider_id')
    .in('session_id', sessionIds)
    .not('provider_id', 'is', null)

  if (!interactions) return []

  const providerCounts = new Map<string, number>()
  interactions.forEach((i: any) => {
    providerCounts.set(i.provider_id, (providerCounts.get(i.provider_id) || 0) + 1)
  })

  const topProviderIds = Array.from(providerCounts.entries())
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]: [string, number]) => id)

  if (topProviderIds.length === 0) return []

  const { data: providers } = await supabase
    .from('linksy_providers')
    .select('id, name')
    .in('id', topProviderIds)

  if (!providers) return []

  return topProviderIds.map((id: string) => {
    const provider = providers.find((p: any) => p.id === id)
    return {
      id,
      name: provider?.name || 'Unknown',
      count: providerCounts.get(id) || 0,
    }
  })
}
