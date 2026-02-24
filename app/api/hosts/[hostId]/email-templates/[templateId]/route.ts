import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * PATCH /api/hosts/[hostId]/email-templates/[templateId]
 * Update an email template (admin only)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { hostId: string; templateId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { hostId, templateId } = params
  const body = await request.json()

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

  const allowedFields = ['name', 'subject', 'body_html', 'variables', 'is_active']

  const updates: Record<string, any> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    )
  }

  const { data: template, error } = await supabase
    .from('linksy_host_email_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('host_id', hostId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  return NextResponse.json(template)
}

/**
 * DELETE /api/hosts/[hostId]/email-templates/[templateId]
 * Delete an email template (admin only) - reverts to system default
 */
export async function DELETE(
  request: Request,
  { params }: { params: { hostId: string; templateId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { hostId, templateId } = params
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

  const { error } = await supabase
    .from('linksy_host_email_templates')
    .delete()
    .eq('id', templateId)
    .eq('host_id', hostId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Template deleted. System default will be used.',
  })
}
