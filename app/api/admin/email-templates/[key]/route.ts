import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { key: string } }
) {
  const { error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const { name, subject, body_html, is_active, trigger_event, variables } = body

  // Map UI field names to DB column names
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (subject !== undefined) updateData.subject_template = subject
  if (body_html !== undefined) updateData.html_template = body_html
  if (is_active !== undefined) updateData.is_active = is_active
  if (trigger_event !== undefined) updateData.trigger_event = trigger_event
  if (variables !== undefined) updateData.variables = variables

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: template, error: updateError } = await supabase
    .from('linksy_email_templates')
    .update(updateData)
    .eq('id', params.key)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Map back to UI-friendly names
  return NextResponse.json({
    id: template.id,
    template_key: template.template_key,
    name: template.name,
    description: template.description,
    subject: template.subject_template,
    body_html: template.html_template,
    variables: template.variables || [],
    is_active: template.is_active,
    trigger_event: template.trigger_event || null,
    created_at: template.created_at,
    updated_at: template.updated_at,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { key: string } }
) {
  const { error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  // Support deletion by ID (UUID) or by template_key
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.key)

  const query = supabase.from('linksy_email_templates').delete()
  const { error: deleteError } = isUuid
    ? await query.eq('id', params.key)
    : await query.eq('template_key', params.key)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
