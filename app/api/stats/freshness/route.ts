import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/stats/freshness
 * Returns providers whose data hasn't been updated in 90+ days
 */
export async function GET(_request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const supabase = await createServiceClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleProviders, error: fetchError } = await supabase
    .from('linksy_providers')
    .select('id, name, slug, updated_at, provider_status')
    .eq('provider_status', 'active')
    .lt('updated_at', ninetyDaysAgo)
    .order('updated_at', { ascending: true })
    .limit(50)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const providers = (staleProviders || []).map((p: any) => ({
    ...p,
    days_stale: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
  }))

  return NextResponse.json({
    staleProviders: providers,
    totalStale: providers.length,
  })
}
