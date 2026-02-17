import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAdmin } from '@/lib/middleware/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const { id } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  const allowedFields = ['name', 'description', 'airs_code', 'sort_order', 'is_active']
  const updates: Record<string, any> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: category, error: updateError } = await supabase
    .from('linksy_need_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(category)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const { id } = params
  const supabase = await createServiceClient()

  const { data: category, error: updateError } = await supabase
    .from('linksy_need_categories')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(category)
}
