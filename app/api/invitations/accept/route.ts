import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/invitations/accept
 * Accept a pending invitation and add the user to the tenant.
 *
 * Called from:
 *   - signup/page.tsx (with ?token= query param, after sign-up)
 *   - invite-accept-form.tsx (with JSON body { token, user_id })
 */
export async function POST(request: Request) {
  const serviceClient = await createServiceClient()

  // Support both query-param (signup page) and JSON body (invite-accept-form)
  const { searchParams } = new URL(request.url)
  let token = searchParams.get('token')
  let explicitUserId: string | null = null

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json()
      if (body.token) token = body.token
      if (body.user_id) explicitUserId = body.user_id
    } catch {
      // Body may be empty for query-param style calls
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
  }

  // Look up the invitation
  const { data: invitation, error: invError } = await serviceClient
    .from('invitations')
    .select('id, tenant_id, email, role, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 })
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
  }

  // Determine the user: prefer explicit user_id, then try authenticated user, then look up by email
  let userId = explicitUserId

  if (!userId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
    }
  }

  if (!userId) {
    // Last resort: look up by invitation email
    const { data: userByEmail } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', invitation.email)
      .single()

    if (userByEmail) {
      userId = userByEmail.id
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'Could not determine user. Please sign up first.' },
      { status: 400 }
    )
  }

  // Check if already a member
  const { data: existing } = await serviceClient
    .from('tenant_users')
    .select('id')
    .eq('tenant_id', invitation.tenant_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    // Add user to tenant
    const { error: insertError } = await serviceClient
      .from('tenant_users')
      .insert({
        tenant_id: invitation.tenant_id,
        user_id: userId,
        role: invitation.role || 'member',
      })

    if (insertError) {
      console.error('Failed to add user to tenant:', insertError)
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }
  }

  // Mark invitation as accepted
  const { error: updateError } = await serviceClient
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  if (updateError) {
    console.error('Failed to mark invitation as accepted:', updateError)
    // Non-fatal: user is already added to tenant
  }

  return NextResponse.json({
    success: true,
    tenant_id: invitation.tenant_id,
    message: 'Invitation accepted successfully',
  })
}
