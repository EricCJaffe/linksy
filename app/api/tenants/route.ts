import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createTenantSchema } from '@/lib/utils/validation'
import { generateInviteToken, getInviteExpirationDate } from '@/lib/utils/auth'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { logger } from '@/lib/utils/logger'
import { sendInvitationEmail } from '@/lib/utils/email'

export async function GET() {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createClient()

  const { data: tenants, error: queryError } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json(tenants)
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const body = await request.json()
  const validation = createTenantSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  // Check if slug is unique
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', validation.data.slug)
    .single<{ id: string }>()

  if (existing) {
    return NextResponse.json(
      { error: 'A tenant with this slug already exists' },
      { status: 400 }
    )
  }

  // Check if admin user already exists
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', validation.data.admin_email)
    .single<{ id: string }>()

  let adminUserId = existingUser?.id

  // Create the tenant
  const { data: tenant, error: insertError } = await serviceClient
    .from('tenants')
    .insert({
      name: validation.data.name,
      slug: validation.data.slug,
      address_line1: validation.data.address_line1,
      address_line2: validation.data.address_line2,
      city: validation.data.city,
      state: validation.data.state,
      postal_code: validation.data.postal_code,
      country: validation.data.country,
      track_location: validation.data.track_location || false,
      primary_contact_id: adminUserId || null,
      settings: {},
      branding: {},
    })
    .select()
    .single<any>()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // If admin user exists, add them to the tenant
  if (adminUserId) {
    // Check if they're already a member
    const { data: existingMembership } = await serviceClient
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('user_id', adminUserId)
      .single<{ id: string }>()

    if (!existingMembership) {
      await serviceClient
        .from('tenant_users')
        .insert({
          tenant_id: tenant.id,
          user_id: adminUserId,
          role: 'admin',
        })
    }
  } else {
    // Create an invitation for the admin user
    const token = generateInviteToken()
    const expiresAt = getInviteExpirationDate()

    const { data: invitation } = await serviceClient
      .from('invitations')
      .insert({
        tenant_id: tenant.id,
        email: validation.data.admin_email,
        role: 'admin',
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single<{ id: string }>()

    // Send invitation email to admin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/signup?token=${token}`

    const emailResult = await sendInvitationEmail({
      email: validation.data.admin_email,
      inviterName: auth.user.email || 'System Administrator',
      tenantName: tenant.name,
      role: 'admin',
      inviteUrl,
    })

    if (!emailResult.success) {
      logger.error('Failed to send tenant admin invitation email', new Error(emailResult.error || 'Unknown error'), {
        email: validation.data.admin_email,
        tenantId: tenant.id,
        invitationId: invitation?.id,
      })
      // Note: We don't fail the tenant creation if email fails
      // The invitation is still created and can be manually resent
    }
  }

  // Log the action
  await serviceClient.from('audit_logs').insert({
    user_id: auth.user.id,
    action: 'create',
    entity_type: 'tenant',
    entity_id: tenant.id,
    metadata: {
      name: tenant.name,
      slug: tenant.slug,
      admin_email: validation.data.admin_email,
      admin_name: validation.data.admin_name,
    },
  })

  return NextResponse.json(tenant, { status: 201 })
}
