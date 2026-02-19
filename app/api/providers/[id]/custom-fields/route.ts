import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServiceClient()

  const { data: fields, error } = await supabase
    .from('linksy_custom_fields')
    .select('*')
    .eq('provider_id', params.id)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(fields || [])
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const body = await request.json()
  const { field_label, field_type, options, is_required, sort_order } = body

  if (!field_label || !field_type) {
    return NextResponse.json({ error: 'field_label and field_type are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: field, error: insertError } = await supabase
    .from('linksy_custom_fields')
    .insert({
      provider_id: params.id,
      field_label,
      field_type,
      options: options || [],
      is_required: is_required || false,
      sort_order: sort_order || 0,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(field, { status: 201 })
}
