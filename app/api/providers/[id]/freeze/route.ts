import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/providers/[id]/freeze?check=pending
 * Check pending referral count before freezing
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const supabase = await createServiceClient()

  const { count } = await supabase
    .from('linksy_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', id)
    .in('status', ['pending', 'in_process'])

  return NextResponse.json({ pending_count: count ?? 0 })
}

/**
 * POST /api/providers/[id]/freeze
 * Freeze or unfreeze a provider
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { action, reason, return_date } = body

  if (!action || !['freeze', 'unfreeze'].includes(action)) {
    return NextResponse.json({ error: 'action must be "freeze" or "unfreeze"' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Check user permissions
  const userId = auth.user.id
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  const isSiteAdmin = userProfile?.role === 'site_admin'

  // Non-admin: check if provider contact and if there are pending referrals
  if (!isSiteAdmin && action === 'freeze') {
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('id, provider_role')
      .eq('provider_id', id)
      .eq('user_id', userId)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Self-freeze: check no pending referrals
    const { count: pendingCount } = await supabase
      .from('linksy_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', id)
      .in('status', ['pending', 'in_process'])

    if ((pendingCount || 0) > 0) {
      return NextResponse.json(
        { error: `Cannot freeze: ${pendingCount} pending referral(s) must be resolved first` },
        { status: 400 }
      )
    }
  }

  if (action === 'freeze') {
    if (!reason) {
      return NextResponse.json({ error: 'Freeze reason is required' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('linksy_providers')
      .update({
        is_frozen: true,
        frozen_reason: reason,
        frozen_at: new Date().toISOString(),
        frozen_by: userId,
        freeze_return_date: return_date || null,
        accepting_referrals: false,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log freeze in provider notes
    await supabase.from('linksy_provider_notes').insert({
      provider_id: id,
      author_id: userId,
      note_type: 'internal',
      content: `Provider frozen. Reason: ${reason}${return_date ? `. Expected return: ${return_date}` : ''}`,
      is_private: true,
    })
  } else {
    const { error: updateError } = await supabase
      .from('linksy_providers')
      .update({
        is_frozen: false,
        frozen_reason: null,
        frozen_at: null,
        frozen_by: null,
        freeze_return_date: null,
        accepting_referrals: true,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log unfreeze in provider notes
    await supabase.from('linksy_provider_notes').insert({
      provider_id: id,
      author_id: userId,
      note_type: 'internal',
      content: 'Provider unfrozen and accepting referrals again.',
      is_private: true,
    })
  }

  return NextResponse.json({ success: true })
}
