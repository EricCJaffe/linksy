import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

export async function GET(_request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()
  const { data: templates, error: fetchError } = await supabase
    .from('linksy_email_templates')
    .select('*')
    .order('name')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Map DB column names to UI-friendly names for the frontend
  const mapped = (templates || []).map((t) => ({
    id: t.id,
    template_key: t.template_key,
    name: t.name,
    description: t.description,
    subject: t.subject_template,
    body_html: t.html_template,
    text_template: t.text_template,
    variables: t.variables || [],
    is_active: t.is_active,
    trigger_event: t.trigger_event || null,
    updated_by: t.updated_by,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const { template_key, name, subject, body_html, variables, trigger_event } = body

  if (!template_key || !name || !subject || !body_html) {
    return NextResponse.json(
      { error: 'template_key, name, subject, and body_html are required' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()
  const { data: template, error: insertError } = await supabase
    .from('linksy_email_templates')
    .insert({
      template_key,
      name,
      subject_template: subject,
      html_template: body_html,
      variables: variables || [],
      trigger_event: trigger_event || null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
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
  }, { status: 201 })
}
