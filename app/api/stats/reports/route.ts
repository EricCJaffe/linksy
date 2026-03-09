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
  const includeTest = searchParams.get('include_test') === 'true'

  const supabase = await createServiceClient()

  const emptyResponse = {
    referralsByCategory: [] as { name: string; count: number }[],
    topReferrers: [] as { id: string; name: string; count: number }[],
    referralsByStatus: [] as { status: string; count: number }[],
    referralsBySource: [] as { source: string; count: number }[],
    monthlyTrends: [] as { month: string; count: number }[],
    recentActivity: {
      last30Days: 0,
    },
    timeToResolution: {
      avgDays: null as number | null,
      totalResolved: 0,
      byStatus: [] as { status: string; avg_days: number; count: number }[],
    },
  }

  try {
    // Use one base ticket query for all aggregates to avoid fragile nested joins.
    let ticketsQuery = supabase
      .from('linksy_tickets')
      .select('provider_id, need_id, status, source, created_at, updated_at')

    if (!includeLegacy) {
      ticketsQuery = ticketsQuery.filter('legacy_id', 'is', null)
    }
    if (!includeTest) {
      ticketsQuery = ticketsQuery.or('is_test.is.null,is_test.eq.false')
    }

    let { data: tickets, error: ticketsError } = await ticketsQuery

    // Backward-compatibility for environments missing legacy_id or is_test columns.
    if (ticketsError && (ticketsError.message.includes('legacy_id') || ticketsError.message.includes('is_test'))) {
      let retryQuery = supabase
        .from('linksy_tickets')
        .select('provider_id, need_id, status, source, created_at, updated_at')
      if (!includeLegacy && !ticketsError.message.includes('legacy_id')) {
        retryQuery = retryQuery.filter('legacy_id', 'is', null)
      }
      const retry = await retryQuery
      tickets = retry.data
      ticketsError = retry.error
    }

    if (ticketsError) {
      console.error('[stats/reports] failed to query tickets', ticketsError)
      return NextResponse.json(emptyResponse)
    }

    const allTickets = tickets || []
    const providerIds = Array.from(
      new Set(allTickets.map((t) => t.provider_id).filter((id): id is string => !!id))
    )
    const needIds = Array.from(
      new Set(allTickets.map((t) => t.need_id).filter((id): id is string => !!id))
    )

    const [providersRes, needsRes, categoriesRes] = await Promise.all([
      providerIds.length > 0
        ? supabase.from('linksy_providers').select('id, name').in('id', providerIds)
        : Promise.resolve({ data: [], error: null } as any),
      needIds.length > 0
        ? supabase.from('linksy_needs').select('id, category_id').in('id', needIds)
        : Promise.resolve({ data: [], error: null } as any),
      supabase.from('linksy_need_categories').select('id, name'),
    ])

    if (providersRes.error) {
      console.error('[stats/reports] failed to query providers', providersRes.error)
    }
    if (needsRes.error) {
      console.error('[stats/reports] failed to query needs', needsRes.error)
    }
    if (categoriesRes.error) {
      console.error('[stats/reports] failed to query need categories', categoriesRes.error)
    }

    const providerNameById = new Map<string, string>()
    ;(providersRes.data || []).forEach((p: any) => providerNameById.set(p.id, p.name))

    const needCategoryById = new Map<string, string | null>()
    ;(needsRes.data || []).forEach((n: any) => needCategoryById.set(n.id, n.category_id ?? null))

    const categoryNameById = new Map<string, string>()
    ;(categoriesRes.data || []).forEach((c: any) => categoryNameById.set(c.id, c.name))

    const categoryMap = new Map<string, number>()
    const providerMap = new Map<string, { id: string; name: string; count: number }>()
    const statusMap = new Map<string, number>()
    const sourceMap = new Map<string, number>()
    const statusResolutionMap = new Map<string, { totalDays: number; count: number }>()
    let totalResolutionDays = 0
    let totalResolved = 0

    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000
    let last30Days = 0

    // Pre-fill last 12 months so empty months still render.
    const monthMap = new Map<string, number>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, 0)
    }

    allTickets.forEach((t) => {
      const statusKey = t.status || 'unknown'
      statusMap.set(statusKey, (statusMap.get(statusKey) || 0) + 1)

      if (t.source) {
        sourceMap.set(t.source, (sourceMap.get(t.source) || 0) + 1)
      }

      if (t.provider_id) {
        const existing = providerMap.get(t.provider_id)
        if (existing) {
          existing.count++
        } else {
          providerMap.set(t.provider_id, {
            id: t.provider_id,
            name: providerNameById.get(t.provider_id) || 'Unknown Provider',
            count: 1,
          })
        }
      }

      if (t.need_id) {
        const categoryId = needCategoryById.get(t.need_id)
        const categoryName = categoryId ? categoryNameById.get(categoryId) : null
        if (categoryName) {
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
        }
      }

      const createdMs = new Date(t.created_at).getTime()
      if (!Number.isNaN(createdMs)) {
        if (createdMs >= thirtyDaysAgoMs) last30Days++
        const d = new Date(createdMs)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (monthMap.has(key)) {
          monthMap.set(key, (monthMap.get(key) || 0) + 1)
        }
      }

      if (t.status !== 'pending') {
        const updatedMs = new Date(t.updated_at).getTime()
        if (!Number.isNaN(createdMs) && !Number.isNaN(updatedMs) && updatedMs >= createdMs) {
          const days = (updatedMs - createdMs) / (1000 * 60 * 60 * 24)
          totalResolutionDays += days
          totalResolved++
          const entry = statusResolutionMap.get(statusKey)
          if (entry) {
            entry.totalDays += days
            entry.count++
          } else {
            statusResolutionMap.set(statusKey, { totalDays: days, count: 1 })
          }
        }
      }
    })

    const referralsByCategory = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const topReferrers = Array.from(providerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    const referralsByStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    const referralsBySource = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    const monthlyTrends = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))

    const avgResolutionDays = totalResolved > 0
      ? Math.round((totalResolutionDays / totalResolved) * 10) / 10
      : null

    const avgResolutionByStatus = Array.from(statusResolutionMap.entries())
      .map(([status, { totalDays, count }]) => ({
        status,
        avg_days: Math.round((totalDays / count) * 10) / 10,
        count,
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      referralsByCategory,
      topReferrers,
      referralsByStatus,
      referralsBySource,
      monthlyTrends,
      recentActivity: {
        last30Days,
      },
      timeToResolution: {
        avgDays: avgResolutionDays,
        totalResolved,
        byStatus: avgResolutionByStatus,
      },
    })
  } catch (error) {
    console.error('[stats/reports] unexpected error', error)
    return NextResponse.json(emptyResponse)
  }
}
