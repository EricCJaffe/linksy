import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/hosts/[hostId]/email-templates
 * Get all email templates for a host
 */
export async function GET(
  request: Request,
  { params }: { params: { hostId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const hostId = params.hostId
  const supabase = await createServiceClient()

  // Check if user is site admin or host admin
  if (!auth.isSiteAdmin) {
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('id')
      .eq('provider_id', hostId)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .in('contact_type', ['provider_admin', 'org_admin'])
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const { data: templates, error } = await supabase
    .from('linksy_host_email_templates')
    .select('*')
    .eq('host_id', hostId)
    .order('template_key', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: templates || [] })
}

/**
 * POST /api/hosts/[hostId]/email-templates
 * Create or update an email template (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: { hostId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const hostId = params.hostId
  const body = await request.json()

  const { template_key, name, subject, body_html, variables = [] } = body

  if (!template_key || !name || !subject || !body_html) {
    return NextResponse.json(
      { error: 'template_key, name, subject, and body_html are required' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Check if user is site admin or host admin
  if (!auth.isSiteAdmin) {
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('id')
      .eq('provider_id', hostId)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .in('contact_type', ['provider_admin', 'org_admin'])
      .maybeSingle()

    if (!contact) {
      return NextResponse.json(
        { error: 'Only site admins and host admins can create email templates' },
        { status: 403 }
      )
    }
  }

  // Upsert: update if exists, insert if not
  const { data: template, error } = await supabase
    .from('linksy_host_email_templates')
    .upsert(
      {
        host_id: hostId,
        template_key,
        name,
        subject,
        body_html,
        variables,
        created_by: auth.user.id,
      },
      {
        onConflict: 'host_id,template_key',
      }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(template, { status: 201 })
}
