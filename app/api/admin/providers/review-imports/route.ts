import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/providers/review-imports
 * Get all providers pending approval
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = await createServiceClient()

  const { data: providers, error: fetchError, count } = await supabase
    .from('linksy_providers')
    .select('*', { count: 'exact' })
    .eq('provider_status', 'pending_approval')
    .order('imported_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({
    providers: providers || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  })
}

/**
 * POST /api/admin/providers/review-imports
 * Approve or reject imported providers in bulk
 *
 * Body:
 * - provider_ids: string[] - IDs of providers to review
 * - action: 'approve' | 'reject'
 */
export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const { provider_ids, action } = body

  if (!Array.isArray(provider_ids) || provider_ids.length === 0) {
    return NextResponse.json(
      { error: 'provider_ids must be a non-empty array' },
      { status: 400 }
    )
  }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be either "approve" or "reject"' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Determine the new status based on action
  const newStatus = action === 'approve' ? 'active' : 'inactive'

  // Update all selected providers
  const { error: updateError, count } = await supabase
    .from('linksy_providers')
    .update({
      provider_status: newStatus,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', provider_ids)
    .eq('provider_status', 'pending_approval') // Only update if still pending

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    action,
    updated: count || 0,
    message: `Successfully ${action}d ${count || 0} provider${count !== 1 ? 's' : ''}`,
  })
}
