import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateUserSchema = z.object({
  tenant_id: z.string().uuid(),
  role: z.enum(['admin', 'member']),
})

async function checkTenantAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, user: null }
  }

  // Check if user is site admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: "site_admin" | "tenant_admin" | "user" }>()

  if (profile?.role === 'site_admin') {
    return { user, error: null, status: null }
  }

  // Check if user is tenant admin
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single<{ role: "admin" | "member" }>()

  if (membership?.role !== 'admin') {
    return { error: 'Forbidden', status: 403, user: null }
  }

  return { user, error: null, status: null }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const body = await request.json()
  const validation = updateUserSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { tenant_id, role } = validation.data
  const userId = params.id

  const { error, status, user } = await checkTenantAdmin(supabase, tenant_id)

  if (error) {
    return NextResponse.json({ error }, { status: status! })
  }

  // Prevent changing your own role
  if (userId === user!.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 }
    )
  }

  // Check if user is in the tenant
  const { data: existingMembership } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('tenant_id', tenant_id)
    .eq('user_id', userId)
    .single<{ id: string }>()

  if (!existingMembership) {
    return NextResponse.json(
      { error: 'User is not a member of this tenant' },
      { status: 404 }
    )
  }

  // Update the user role
  const { data: updated, error: updateError } = await serviceClient
    .from('tenant_users')
    .update({ role })
    .eq('tenant_id', tenant_id)
    .eq('user_id', userId)
    .select()
    .single<any>()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log the action
  await serviceClient.from('audit_logs').insert({
    tenant_id,
    user_id: user!.id,
    action: 'update_user_role',
    entity_type: 'tenant_user',
    entity_id: userId,
    metadata: { new_role: role },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const body = await request.json()
  const tenantId = body.tenant_id

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenant_id is required' },
      { status: 400 }
    )
  }

  const userId = params.id

  const { error, status, user } = await checkTenantAdmin(supabase, tenantId)

  if (error) {
    return NextResponse.json({ error }, { status: status! })
  }

  // Prevent removing yourself
  if (userId === user!.id) {
    return NextResponse.json(
      { error: 'You cannot remove yourself from the tenant' },
      { status: 400 }
    )
  }

  // Delete the tenant_users entry
  const { error: deleteError } = await serviceClient
    .from('tenant_users')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Log the action
  await serviceClient.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user!.id,
    action: 'remove_user',
    entity_type: 'tenant_user',
    entity_id: userId,
    metadata: {},
  })

  return NextResponse.json({ success: true })
}
