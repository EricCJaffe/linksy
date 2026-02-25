import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * PATCH /api/providers/[id]/contacts/[contactId]
 * Update a contact
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId, contactId } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  // Verify the contact belongs to this provider
  const { data: existingContact, error: fetchError } = await supabase
    .from('linksy_provider_contacts')
    .select('*')
    .eq('id', contactId)
    .eq('provider_id', providerId)
    .single()

  if (fetchError || !existingContact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // Check permissions
  let canEdit = auth.isSiteAdmin || auth.isTenantAdmin
  let isEditingOwnContact = false

  if (!canEdit) {
    const { data: userContact } = await supabase
      .from('linksy_provider_contacts')
      .select('provider_role')
      .eq('provider_id', providerId)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .single()

    if (userContact?.provider_role === 'admin') {
      canEdit = true
    } else if (existingContact.user_id === auth.user.id) {
      // User editing their own contact
      canEdit = true
      isEditingOwnContact = true
    }
  }

  if (!canEdit) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    )
  }

  // Build update object
  const updates: Record<string, any> = {}
  const allowedFields = isEditingOwnContact
    ? ['job_title', 'phone']  // Regular users can only edit these fields on their own contact
    : [
        'job_title',
        'phone',
        'contact_type',
        'provider_role',
        'is_primary_contact',
        'is_default_referral_handler',
        'status',
      ]

  // Check if user is trying to edit restricted fields
  if (isEditingOwnContact) {
    const restrictedFields = Object.keys(body).filter(
      field => !allowedFields.includes(field)
    )

    if (restrictedFields.length > 0) {
      return NextResponse.json(
        { error: `You can only edit ${allowedFields.join(', ')} on your own contact` },
        { status: 403 }
      )
    }
  }

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Update the contact
  const { data: contact, error: updateError } = await supabase
    .from('linksy_provider_contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating contact:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(contact)
}

/**
 * DELETE /api/providers/[id]/contacts/[contactId]
 * Delete (archive) a contact
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId, contactId } = params
  const supabase = await createServiceClient()

  // Check if user can archive contacts
  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    const { data: userContact } = await supabase
      .from('linksy_provider_contacts')
      .select('provider_role')
      .eq('provider_id', providerId)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .single()

    if (!userContact || userContact.provider_role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required to archive contacts' },
        { status: 403 }
      )
    }
  }

  // Archive instead of hard delete
  const { error: updateError } = await supabase
    .from('linksy_provider_contacts')
    .update({ status: 'archived' })
    .eq('id', contactId)
    .eq('provider_id', providerId)

  if (updateError) {
    console.error('Error archiving contact:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
