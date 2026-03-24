import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, getTenantId } from '@/lib/middleware/auth'

/**
 * PATCH /api/admin/status-reasons/[id]
 * Update a status reason (label, sort_order, is_active).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const tenantId = getTenantId(auth)
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if ('label' in body && typeof body.label === 'string') {
    updates.label = body.label.trim()
  }
  if ('sort_order' in body && typeof body.sort_order === 'number') {
    updates.sort_order = body.sort_order
  }
  if ('is_active' in body && typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const supabase = await createServiceClient()
  const { data, error: dbError } = await supabase
    .from('linksy_ticket_status_reasons')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/admin/status-reasons/[id]
 * Delete a status reason.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const tenantId = getTenantId(auth)
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
  }

  const supabase = await createServiceClient()
  const { error: dbError } = await supabase
    .from('linksy_ticket_status_reasons')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
