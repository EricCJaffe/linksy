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
  const includeTest = searchParams.get('include_test') === 'true'

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
      return handleReferralsReport(supabase, dataScope, providerIds, auth.user.id, includeLegacy, includeTest)

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
  includeLegacy: boolean,
  includeTest: boolean = false
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
      need_id,
      source,
      legacy_id,
      client_name,
      provider:linksy_providers!provider_id(id, name, referral_type),
      need:linksy_needs!need_id(id, name, category:linksy_need_categories!category_id(name))
    `)

  // Filter by scope
  if (dataScope === 'providers') {
    ticketsQuery = ticketsQuery.in('provider_id', providerIds)
  } else if (dataScope === 'personal') {
    // For personal scope, filter by provider contact's providers
    ticketsQuery = ticketsQuery.in('provider_id', providerIds)
  }

  // Filter by legacy flag (exclude legacy-imported tickets if includeLegacy is false)
  if (!includeLegacy) {
    ticketsQuery = ticketsQuery.is('legacy_id', null)
  }

  // Exclude test referrals from analytics by default unless toggled
  if (!includeTest) {
    ticketsQuery = ticketsQuery.or('is_test.is.null,is_test.eq.false')
  }

  const { data: tickets, error } = await ticketsQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Split tickets into referral vs non-referral (contact_directly) providers
  const referralTickets = tickets.filter(
    (t: any) => t.provider?.referral_type !== 'contact_directly'
  )
  const nonReferralTickets = tickets.filter(
    (t: any) => t.provider?.referral_type === 'contact_directly'
  )

  // Aggregate data (referral providers only)
  const referralsByStatus = aggregateByField(referralTickets, 'status')
  const referralsByCategory = aggregateByCategory(referralTickets)
  const referralsBySource = aggregateByField(referralTickets, 'source')
  const topReferrers = aggregateTopProvidersWithServices(referralTickets)
  const monthlyTrends = aggregateMonthlyTrends(referralTickets)
  const recentActivity = calculateRecentActivity(referralTickets)
  const timeToResolution = calculateTimeToResolution(referralTickets)

  // Non-referral summary
  const nonReferralSummary = {
    total: nonReferralTickets.length,
    byStatus: aggregateByField(nonReferralTickets, 'status'),
    byCategory: aggregateByCategory(nonReferralTickets),
    topProviders: aggregateTopProvidersWithServices(nonReferralTickets),
  }

  // Unique client count (exclude test names like "Mega Coolmint")
  const uniqueClients = calculateUniqueClients(tickets)

  return NextResponse.json({
    referralsByStatus,
    referralsByCategory,
    referralsBySource,
    topReferrers,
    monthlyTrends,
    recentActivity,
    timeToResolution,
    nonReferralSummary,
    uniqueClients,
    totalIncludingNR: tickets.length,
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

  const totalCrisisDetections = sessions.filter((s: any) => s.crisis_detected).length

  // Get interactions for these sessions
  const sessionIds = sessions.map((s: any) => s.id)
  let interactions: any[] = []
  if (sessionIds.length > 0) {
    const { data: interactionData } = await supabase
      .from('linksy_interactions')
      .select('*')
      .in('session_id', sessionIds)
    interactions = interactionData || []
  }
  const totalInteractions = interactions.length

  // Aggregate interaction types
  const interactionsByType = aggregateByField(interactions || [], 'interaction_type')

  // Top providers by interaction
  const topProvidersByInteraction = await getTopProvidersByInteraction(
    supabase,
    sessions.map((s: any) => s.id)
  )

  // Crisis breakdown
  const crisisBreakdown = sessions
    .filter((s: any) => s.crisis_detected && s.crisis_type)
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
    .filter((s: any) => s.crisis_detected)
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
  // linksy_ticket_events table was removed in schema migration.
  // Until it's recreated, return empty reassignment stats.
  // TODO: Recreate linksy_ticket_events table or derive reassignment data from ticket comments/audit logs.
  return NextResponse.json({
    total_reassignments: 0,
    provider_initiated: 0,
    admin_initiated: 0,
    average_reassignments_per_ticket: 0,
    top_forwarding_providers: [],
    top_receiving_providers: [],
    reason_breakdown: {},
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
    .map(([name, count]: [string, number]) => ({ [field]: name, count }))
    .sort((a: any, b: any) => b.count - a.count)
}

function aggregateByCategory(tickets: any[]) {
  const counts = new Map<string, number>()
  tickets.forEach((ticket: any) => {
    const categoryName = ticket.need?.category?.name || ticket.need?.name || 'Uncategorized'
    counts.set(categoryName, (counts.get(categoryName) || 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([name, count]: [string, number]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
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

function aggregateTopProvidersWithServices(tickets: any[]) {
  const providerMap = new Map<string, {
    id: string
    name: string
    referralType: string
    count: number
    services: Map<string, number>
  }>()

  tickets.forEach((ticket: any) => {
    if (!ticket.provider) return
    const key = ticket.provider.id

    if (!providerMap.has(key)) {
      providerMap.set(key, {
        id: ticket.provider.id,
        name: ticket.provider.name,
        referralType: ticket.provider.referral_type || 'standard',
        count: 0,
        services: new Map(),
      })
    }

    const entry = providerMap.get(key)!
    entry.count++

    const serviceName = ticket.need?.name
    if (serviceName) {
      entry.services.set(serviceName, (entry.services.get(serviceName) || 0) + 1)
    }
  })

  return Array.from(providerMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      referralType: p.referralType,
      count: p.count,
      topServices: Array.from(p.services.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count })),
    }))
}

const TEST_NAME_PATTERNS = [
  /mega\s*coolmint/i,
  /test\s*(user|client|referral|person)/i,
  /^test$/i,
]

function isTestClientName(name: string | null): boolean {
  if (!name || !name.trim()) return true
  return TEST_NAME_PATTERNS.some((pattern) => pattern.test(name.trim()))
}

function calculateUniqueClients(tickets: any[]) {
  const allClients = new Set<string>()
  const realClients = new Set<string>()
  let blankCount = 0
  let testNameCount = 0

  tickets.forEach((ticket: any) => {
    const name = ticket.client_name?.trim()?.toLowerCase()
    if (!name) {
      blankCount++
      return
    }

    allClients.add(name)

    if (isTestClientName(ticket.client_name)) {
      testNameCount++
    } else {
      realClients.add(name)
    }
  })

  return {
    totalReferrals: tickets.length,
    uniqueClients: realClients.size,
    uniqueClientsIncludingTest: allClients.size,
    blankNameCount: blankCount,
    testNameCount,
    utilizationRatio: realClients.size > 0
      ? Math.round((tickets.length / realClients.size) * 10) / 10
      : 0,
  }
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
