import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/stats/search-analytics
 * Returns search session and interaction analytics for the admin dashboard.
 */
export async function GET() {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = await createServiceClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)

  const [
    { count: totalSessionCount },
    { count: recentSessionCount },
    { data: monthlySessions },
    { data: interactions },
    { data: crisisSessions },
    { data: funnelSessions },
  ] = await Promise.all([
    // Totals
    supabase.from('linksy_search_sessions').select('*', { count: 'exact', head: true }),
    // Last 30 days
    supabase
      .from('linksy_search_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString()),
    // Monthly trend (last 12 months)
    supabase
      .from('linksy_search_sessions')
      .select('created_at')
      .gte('created_at', twelveMonthsAgo.toISOString()),
    // All interactions
    supabase
      .from('linksy_interactions')
      .select('interaction_type, provider_id, provider:linksy_providers(name)'),
    // Crisis sessions
    supabase
      .from('linksy_search_sessions')
      .select('id, crisis_type, created_at')
      .eq('crisis_detected', true)
      .order('created_at', { ascending: false })
      .limit(20),
    // Funnel + geographic data
    supabase
      .from('linksy_search_sessions')
      .select('created_ticket, services_clicked, zip_code_searched'),
  ])

  // Monthly search trend
  const monthMap = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, 0)
  }
  monthlySessions?.forEach((s: any) => {
    const d = new Date(s.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) || 0) + 1)
  })
  const monthlySearchTrend = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }))

  // Interaction breakdown by type
  const interactionTypeMap = new Map<string, number>()
  const providerInteractionMap = new Map<string, { name: string; count: number }>()
  interactions?.forEach((i: any) => {
    interactionTypeMap.set(i.interaction_type, (interactionTypeMap.get(i.interaction_type) || 0) + 1)
    if (i.provider_id && i.provider?.name) {
      const existing = providerInteractionMap.get(i.provider_id)
      if (existing) existing.count++
      else providerInteractionMap.set(i.provider_id, { name: i.provider.name, count: 1 })
    }
  })

  const interactionsByType = Array.from(interactionTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  const topProvidersByInteraction = Array.from(providerInteractionMap.entries())
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // Crisis breakdown by type
  const crisisTypeMap = new Map<string, number>()
  crisisSessions?.forEach((s: any) => {
    if (s.crisis_type) {
      crisisTypeMap.set(s.crisis_type, (crisisTypeMap.get(s.crisis_type) || 0) + 1)
    }
  })
  const crisisBreakdown = Array.from(crisisTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // Search-to-referral funnel
  const engagedCount = funnelSessions?.filter(
    (s: any) => Array.isArray(s.services_clicked) && s.services_clicked.length > 0
  ).length ?? 0
  const convertedCount = funnelSessions?.filter((s: any) => s.created_ticket === true).length ?? 0
  const total = totalSessionCount ?? 0
  const funnel = {
    totalSessions: total,
    engagedSessions: engagedCount,
    convertedSessions: convertedCount,
    engagementRate: total > 0 ? Math.round((engagedCount / total) * 1000) / 10 : 0,
    conversionRate: total > 0 ? Math.round((convertedCount / total) * 1000) / 10 : 0,
    engagedConversionRate: engagedCount > 0 ? Math.round((convertedCount / engagedCount) * 1000) / 10 : 0,
  }

  // Geographic distribution — top zip codes
  const zipMap = new Map<string, number>()
  funnelSessions?.forEach((s: any) => {
    const zip = s.zip_code_searched || 'Unknown'
    zipMap.set(zip, (zipMap.get(zip) || 0) + 1)
  })
  const topZipCodes = Array.from(zipMap.entries())
    .map(([zip_code, count]) => ({ zip_code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  return NextResponse.json({
    totalSessions: total,
    sessionsLast30Days: recentSessionCount ?? 0,
    totalInteractions: interactions?.length ?? 0,
    totalCrisisDetections: crisisSessions?.length ?? 0,
    monthlySearchTrend,
    interactionsByType,
    topProvidersByInteraction,
    crisisBreakdown,
    recentCrisisSessions: (crisisSessions ?? []).slice(0, 10),
    funnel,
    topZipCodes,
  })
}
