import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, getTenantId } from '@/lib/middleware/auth'

/**
 * GET /api/admin/status-reasons?parent_status=unable_to_assist
 * Returns status reasons for the tenant, optionally filtered by parent_status.
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const tenantId = getTenantId(auth)
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const parentStatus = searchParams.get('parent_status')

  const supabase = await createServiceClient()
  let query = supabase
    .from('linksy_ticket_status_reasons')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('parent_status')
    .order('sort_order')

  if (parentStatus) {
    query = query.eq('parent_status', parentStatus)
  }

  const { data, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/admin/status-reasons
 * Create a new status reason. Admin only.
 */
export async function POST(request: Request) {
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
  const { parent_status, label } = body

  if (!parent_status || !label?.trim()) {
    return NextResponse.json({ error: 'parent_status and label are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Get max sort_order for this parent_status
  const { data: existing } = await supabase
    .from('linksy_ticket_status_reasons')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .eq('parent_status', parent_status)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { data, error: dbError } = await supabase
    .from('linksy_ticket_status_reasons')
    .insert({
      tenant_id: tenantId,
      parent_status,
      label: label.trim(),
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
