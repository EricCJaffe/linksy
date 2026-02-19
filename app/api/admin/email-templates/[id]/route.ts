import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const allowedFields = ['name', 'subject', 'body_html', 'variables', 'is_active']
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }

  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = await createServiceClient()
  const { data: template, error: updateError } = await supabase
    .from('linksy_email_templates')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(template)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()
  const { error: deleteError } = await supabase
    .from('linksy_email_templates')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
