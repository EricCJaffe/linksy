import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAdmin } from '@/lib/middleware/auth'

/**
 * PATCH /api/admin/providers/bulk
 * Bulk update providers (activate/deactivate)
 */
export async function PATCH(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { ids, is_active } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  if (typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { error: updateError, count } = await supabase
    .from('linksy_providers')
    .update({ is_active })
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ updated: count ?? ids.length })
}
