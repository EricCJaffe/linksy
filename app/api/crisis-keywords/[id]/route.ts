import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { id } = params
  const body = await request.json()

  const allowedFields = ['keyword', 'crisis_type', 'severity', 'response_template', 'emergency_resources', 'is_active']
  const updates: Record<string, any> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = key === 'keyword' ? body[key].trim().toLowerCase() : body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data, error: updateError } = await supabase
    .from('linksy_crisis_keywords')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { id } = params
  const supabase = await createServiceClient()

  // Soft delete — set is_active = false
  const { data, error: updateError } = await supabase
    .from('linksy_crisis_keywords')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
