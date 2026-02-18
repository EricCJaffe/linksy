import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/providers/[id]/analytics
 * Returns engagement analytics (interaction counts) for a specific provider.
 *
 * Access: site_admin, tenant_admin, or a confirmed contact for this provider.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = params
  const supabase = await createServiceClient()

  // Non-admins must be a contact for this provider
  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('id')
      .eq('provider_id', id)
      .eq('user_id', auth.user.id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [{ data: allTime }, { data: recent }] = await Promise.all([
    // All-time interactions for this provider
    supabase
      .from('linksy_interactions')
      .select('interaction_type')
      .eq('provider_id', id),
    // Last 30 days
    supabase
      .from('linksy_interactions')
      .select('interaction_type')
      .eq('provider_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const countByType = (rows: { interaction_type: string }[] | null) => {
    const map: Record<string, number> = {}
    for (const row of rows || []) {
      map[row.interaction_type] = (map[row.interaction_type] || 0) + 1
    }
    return map
  }

  const allTimeByType = countByType(allTime)
  const recentByType = countByType(recent)

  return NextResponse.json({
    allTime: {
      total: allTime?.length ?? 0,
      profile_view: allTimeByType.profile_view ?? 0,
      phone_click: allTimeByType.phone_click ?? 0,
      website_click: allTimeByType.website_click ?? 0,
      directions_click: allTimeByType.directions_click ?? 0,
    },
    last30Days: {
      total: recent?.length ?? 0,
      profile_view: recentByType.profile_view ?? 0,
      phone_click: recentByType.phone_click ?? 0,
      website_click: recentByType.website_click ?? 0,
      directions_click: recentByType.directions_click ?? 0,
    },
  })
}
