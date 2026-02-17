import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/stats/reports
 * Get detailed reports for analytics
 */
export async function GET(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const includeLegacy = searchParams.get('includeLegacy') === 'true'

  const supabase = await createServiceClient()

  // Referrals by need category
  let needQuery = supabase
    .from('linksy_tickets')
    .select(`
      need_id,
      need:linksy_needs(name, category_id, category:linksy_need_categories(name))
    `)
  if (!includeLegacy) {
    needQuery = needQuery.filter('legacy_id', 'is', null)
  }
  const { data: referralsByNeed } = await needQuery

  // Aggregate by category
  const categoryMap = new Map<string, { name: string; count: number }>()
  referralsByNeed?.forEach((ticket: any) => {
    if (ticket.need?.category?.name) {
      const categoryName = ticket.need.category.name
      const existing = categoryMap.get(categoryName)
      if (existing) {
        existing.count++
      } else {
        categoryMap.set(categoryName, { name: categoryName, count: 1 })
      }
    }
  })

  const referralsByCategory = Array.from(categoryMap.values())
    .sort((a, b) => b.count - a.count)

  // Top providers by referral count
  let providerQuery = supabase
    .from('linksy_tickets')
    .select('provider_id, provider:linksy_providers(name)')
  if (!includeLegacy) {
    providerQuery = providerQuery.filter('legacy_id', 'is', null)
  }
  const { data: topProviders } = await providerQuery

  // Aggregate by provider
  const providerMap = new Map<string, { id: string; name: string; count: number }>()
  topProviders?.forEach((ticket: any) => {
    if (ticket.provider_id && ticket.provider?.name) {
      const existing = providerMap.get(ticket.provider_id)
      if (existing) {
        existing.count++
      } else {
        providerMap.set(ticket.provider_id, {
          id: ticket.provider_id,
          name: ticket.provider.name,
          count: 1,
        })
      }
    }
  })

  const topReferrers = Array.from(providerMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  // Referrals by status
  let statusQuery = supabase
    .from('linksy_tickets')
    .select('status')
  if (!includeLegacy) {
    statusQuery = statusQuery.filter('legacy_id', 'is', null)
  }
  const { data: ticketsByStatus } = await statusQuery

  const statusMap = new Map<string, number>()
  ticketsByStatus?.forEach((ticket) => {
    const count = statusMap.get(ticket.status) || 0
    statusMap.set(ticket.status, count + 1)
  })

  const referralsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }))

  // Referrals by source
  let sourceQuery = supabase
    .from('linksy_tickets')
    .select('source')
  if (!includeLegacy) {
    sourceQuery = sourceQuery.filter('legacy_id', 'is', null)
  }
  const { data: ticketsBySource } = await sourceQuery

  const sourceMap = new Map<string, number>()
  ticketsBySource?.forEach((ticket) => {
    if (ticket.source) {
      const count = sourceMap.get(ticket.source) || 0
      sourceMap.set(ticket.source, count + 1)
    }
  })

  const referralsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({
    source,
    count,
  }))

  // Recent trends (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Monthly trends (last 12 months)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)

  let recentQuery = supabase
    .from('linksy_tickets')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo.toISOString())
  if (!includeLegacy) {
    recentQuery = recentQuery.filter('legacy_id', 'is', null)
  }

  let monthlyQuery = supabase
    .from('linksy_tickets')
    .select('created_at')
    .gte('created_at', twelveMonthsAgo.toISOString())
  if (!includeLegacy) {
    monthlyQuery = monthlyQuery.filter('legacy_id', 'is', null)
  }

  const [recentTickets, monthlyTickets] = await Promise.all([recentQuery, monthlyQuery])

  // Aggregate monthly tickets into month buckets
  const monthMap = new Map<string, number>()
  // Pre-fill last 12 months so months with 0 tickets still appear
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, 0)
  }
  monthlyTickets.data?.forEach((t) => {
    const d = new Date(t.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) || 0) + 1)
    }
  })
  const monthlyTrends = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }))

  return NextResponse.json({
    referralsByCategory,
    topReferrers,
    referralsByStatus,
    referralsBySource,
    monthlyTrends,
    recentActivity: {
      last30Days: recentTickets.data?.length || 0,
    },
  })
}
