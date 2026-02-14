import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { invitationSchema } from '@/lib/utils/validation'
import { generateInviteToken, getInviteExpirationDate } from '@/lib/utils/auth'
import { sendInvitationEmail } from '@/lib/utils/email'
import { logger } from '@/lib/utils/logger'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
  }

  // Check if user has admin access to this tenant
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single<{ role: "admin" | "member" }>()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: "site_admin" | "tenant_admin" | "user" }>()

  if (membership?.role !== 'admin' && profile?.role !== 'site_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: invitations, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(invitations)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { tenant_id, ...rest } = body

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
  }

  const validation = invitationSchema.safeParse(rest)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  // Check if user has admin access to this tenant
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', tenant_id)
    .eq('user_id', user.id)
    .single<{ role: "admin" | "member" }>()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: "site_admin" | "tenant_admin" | "user" }>()

  if (membership?.role !== 'admin' && profile?.role !== 'site_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('users')
    .select('id')
    .eq('email', validation.data.email)
    .single<{ id: string }>()

  if (existingMember) {
    const { data: existingMembership } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('user_id', existingMember.id)
      .single<{ id: string }>()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this tenant' },
        { status: 400 }
      )
    }
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('tenant_id', tenant_id)
    .eq('email', validation.data.email)
    .is('accepted_at', null)
    .single<{ id: string }>()

  if (existingInvite) {
    return NextResponse.json(
      { error: 'An invitation has already been sent to this email' },
      { status: 400 }
    )
  }

  const token = generateInviteToken()
  const expiresAt = getInviteExpirationDate()

  const { data: invitation, error } = await serviceClient
    .from('invitations')
    .insert({
      tenant_id,
      email: validation.data.email,
      role: validation.data.role,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single<any>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get tenant information for email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenant_id)
    .single<{ name: string }>()

  // Get inviter information for email
  const { data: inviter } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single<{ full_name: string | null; email: string }>()

  // Send invitation email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/signup?token=${token}`

  const emailResult = await sendInvitationEmail({
    email: validation.data.email,
    inviterName: inviter?.full_name || inviter?.email || 'A team member',
    tenantName: tenant?.name || 'the organization',
    role: validation.data.role,
    inviteUrl,
  })

  if (!emailResult.success) {
    logger.error('Failed to send invitation email', new Error(emailResult.error || 'Unknown error'), {
      email: validation.data.email,
      tenantId: tenant_id,
      invitationId: invitation.id,
    })
    // Note: We don't fail the invitation creation if email fails
    // The invitation is still created and can be manually resent
  }

  // Log the action
  await serviceClient.from('audit_logs').insert({
    tenant_id,
    user_id: user.id,
    action: 'invite_user',
    entity_type: 'invitation',
    entity_id: invitation.id,
    metadata: {
      email: validation.data.email,
      role: validation.data.role,
      emailSent: emailResult.success,
    },
  })

  return NextResponse.json(invitation, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { searchParams } = new URL(request.url)
  const invitationId = searchParams.get('id')

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!invitationId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Get the invitation to check permissions
  const { data: invitation } = await supabase
    .from('invitations')
    .select('tenant_id')
    .eq('id', invitationId)
    .single<{ tenant_id: string }>()

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  // Check if user has admin access
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', invitation.tenant_id)
    .eq('user_id', user.id)
    .single<{ role: "admin" | "member" }>()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: "site_admin" | "tenant_admin" | "user" }>()

  if (membership?.role !== 'admin' && profile?.role !== 'site_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await serviceClient
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
