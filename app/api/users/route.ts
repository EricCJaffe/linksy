import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { logger } from '@/lib/utils/logger'

export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
  }

  // Check if user has access to this tenant
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', auth.user.id)
    .single<{ role: "admin" | "member" }>()

  if (!membership && !auth.isSiteAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: users, error: queryError } = await supabase
    .from('tenant_users')
    .select(`
      *,
      user:users(id, email, full_name, avatar_url, role)
    `)
    .eq('tenant_id', tenantId)

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json(users)
}

export async function DELETE(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')
  const userId = searchParams.get('user_id')

  if (!tenantId || !userId) {
    return NextResponse.json(
      { error: 'tenant_id and user_id are required' },
      { status: 400 }
    )
  }

  // Check if user has admin access to this tenant
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', auth.user.id)
    .single<{ role: "admin" | "member" }>()

  if (membership?.role !== 'admin' && !auth.isSiteAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent removing yourself
  if (userId === auth.user.id) {
    return NextResponse.json(
      { error: 'You cannot remove yourself from the tenant' },
      { status: 400 }
    )
  }

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
    user_id: auth.user.id,
    action: 'remove_user',
    entity_type: 'tenant_user',
    entity_id: userId,
    metadata: {},
  })

  return NextResponse.json({ success: true })
}
