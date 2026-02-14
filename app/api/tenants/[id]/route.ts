import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { tenantSchema } from '@/lib/utils/validation'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createClient()

  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', params.id)
    .single<any>()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  return NextResponse.json(tenant)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const body = await request.json()

  // Only allow updating specific fields
  const allowedUpdates = {
    name: body.name,
    settings: body.settings,
    branding: body.branding,
  }

  // Remove undefined fields
  Object.keys(allowedUpdates).forEach((key) => {
    if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
      delete allowedUpdates[key as keyof typeof allowedUpdates]
    }
  })

  // Validate name if provided
  if (allowedUpdates.name) {
    const validation = tenantSchema.pick({ name: true }).safeParse({ name: allowedUpdates.name })
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }
  }

  const { data: tenant, error: updateError } = await serviceClient
    .from('tenants')
    .update(allowedUpdates)
    .eq('id', params.id)
    .select()
    .single<any>()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log the action
  await serviceClient.from('audit_logs').insert({
    user_id: auth.user.id,
    action: 'update',
    entity_type: 'tenant',
    entity_id: tenant.id,
    metadata: { updates: Object.keys(allowedUpdates) },
  })

  return NextResponse.json(tenant)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  // Get tenant info before deleting for audit log
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug')
    .eq('id', params.id)
    .single<{ name: string; slug: string }>()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Delete tenant (cascade will handle related records via database constraints)
  const { error: deleteError } = await serviceClient
    .from('tenants')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Log the action
  await serviceClient.from('audit_logs').insert({
    user_id: auth.user.id,
    action: 'delete',
    entity_type: 'tenant',
    entity_id: params.id,
    metadata: { name: tenant.name, slug: tenant.slug },
  })

  return NextResponse.json({ success: true })
}
