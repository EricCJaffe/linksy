import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAdmin } from '@/lib/middleware/auth'

/**
 * PATCH /api/admin/providers/bulk
 * Bulk update providers (activate/deactivate/pause, or change status)
 */
export async function PATCH(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { ids, is_active, provider_status } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  const updates: Record<string, any> = {}

  if (typeof is_active === 'boolean') {
    updates.is_active = is_active
    // Keep provider_status in sync
    updates.provider_status = is_active ? 'active' : 'inactive'
  }

  if (provider_status && ['active', 'paused', 'inactive'].includes(provider_status)) {
    updates.provider_status = provider_status
    updates.is_active = provider_status !== 'inactive'
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { error: updateError, count } = await supabase
    .from('linksy_providers')
    .update(updates)
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ updated: count ?? ids.length })
}
