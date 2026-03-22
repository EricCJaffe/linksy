import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/description-review
 * Returns description review history and stats
 */
export async function GET(request: Request) {
  const auth = await requireSiteAdmin()
  if (auth instanceof NextResponse) return auth

  const url = new URL(request.url)
  const providerId = url.searchParams.get('provider_id')

  const supabase = await createServiceClient()

  if (providerId) {
    // Get reviews for a specific provider
    const { data, error } = await supabase
      .from('linksy_description_reviews')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  }

  // Get aggregate stats
  const { data, error } = await supabase
    .from('linksy_description_reviews')
    .select('status')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const stats = {
    total: data?.length || 0,
    pending: data?.filter((r) => r.status === 'pending').length || 0,
    accepted_current: data?.filter((r) => r.status === 'accepted_current').length || 0,
    accepted_ai: data?.filter((r) => r.status === 'accepted_ai').length || 0,
    edited: data?.filter((r) => r.status === 'edited').length || 0,
    expired: data?.filter((r) => r.status === 'expired').length || 0,
    errors: data?.filter((r) => r.status === 'error').length || 0,
  }

  return NextResponse.json(stats)
}

/**
 * POST /api/admin/description-review
 * Manually trigger description review for specific providers
 * Body: { provider_ids: string[] }
 */
export async function POST(request: Request) {
  const auth = await requireSiteAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { provider_ids } = body

  if (!provider_ids || !Array.isArray(provider_ids) || provider_ids.length === 0) {
    return NextResponse.json({ error: 'provider_ids array is required' }, { status: 400 })
  }

  // Forward to the cron endpoint with provider_ids
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET || ''

  const response = await fetch(`${appUrl}/api/cron/description-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ provider_ids }),
  })

  const result = await response.json()
  return NextResponse.json(result, { status: response.status })
}

/**
 * PATCH /api/admin/description-review
 * Override the next review date for a provider
 * Body: { provider_id: string, next_review_at: string | null }
 */
export async function PATCH(request: Request) {
  const auth = await requireSiteAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { provider_id, next_review_at } = body

  if (!provider_id) {
    return NextResponse.json({ error: 'provider_id is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('linksy_providers')
    .update({
      next_description_review_at: next_review_at || null,
    })
    .eq('id', provider_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
