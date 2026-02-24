import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * PATCH /api/hosts/[hostId]/custom-fields/[fieldId]
 * Update a custom field (admin only)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { hostId: string; fieldId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { hostId, fieldId } = params
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

  const allowedFields = [
    'field_label',
    'field_type',
    'field_options',
    'placeholder',
    'help_text',
    'is_required',
    'sort_order',
    'is_active',
  ]

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

  const { data: field, error } = await supabase
    .from('linksy_host_custom_fields')
    .update(updates)
    .eq('id', fieldId)
    .eq('host_id', hostId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!field) {
    return NextResponse.json({ error: 'Field not found' }, { status: 404 })
  }

  return NextResponse.json(field)
}

/**
 * DELETE /api/hosts/[hostId]/custom-fields/[fieldId]
 * Delete a custom field (admin only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { hostId: string; fieldId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { hostId, fieldId } = params
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
    .from('linksy_host_custom_fields')
    .delete()
    .eq('id', fieldId)
    .eq('host_id', hostId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
