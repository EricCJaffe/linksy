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

  return NextResponse.json(templates || [])
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const { slug, name, subject, body_html, variables } = body

  if (!slug || !name || !subject || !body_html) {
    return NextResponse.json({ error: 'slug, name, subject, and body_html are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: template, error: insertError } = await supabase
    .from('linksy_email_templates')
    .insert({ slug, name, subject, body_html, variables: variables || [] })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(template, { status: 201 })
}
