import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/stats/top-providers
 * Top providers by referral volume with optional date range and service breakdown
 */
export async function GET(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const includeServices = searchParams.get('include_services') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_tickets')
    .select('provider_id, need_id, provider:linksy_providers!provider_id(name), need:linksy_needs!need_id(name)')
    .or('is_test.is.null,is_test.eq.false')

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const { data: tickets, error: ticketsError } = await query

  if (ticketsError) {
    return NextResponse.json({ error: ticketsError.message }, { status: 500 })
  }

  // Aggregate by provider
  const providerMap = new Map<string, {
    id: string
    name: string
    count: number
    services: Map<string, number>
  }>()

  for (const ticket of tickets || []) {
    if (!ticket.provider_id) continue
    const providerName = (ticket.provider as any)?.name || 'Unknown'
    const needName = (ticket.need as any)?.name || null

    if (!providerMap.has(ticket.provider_id)) {
      providerMap.set(ticket.provider_id, {
        id: ticket.provider_id,
        name: providerName,
        count: 0,
        services: new Map(),
      })
    }

    const entry = providerMap.get(ticket.provider_id)!
    entry.count++

    if (needName) {
      entry.services.set(needName, (entry.services.get(needName) || 0) + 1)
    }
  }

  const topProviders = Array.from(providerMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.name,
      count: p.count,
      ...(includeServices
        ? {
            top_services: Array.from(p.services.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([name, count]) => ({ name, count })),
          }
        : {}),
    }))

  return NextResponse.json({ providers: topProviders })
}
