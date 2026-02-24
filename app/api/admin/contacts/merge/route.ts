import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * POST /api/admin/contacts/merge
 * Merge duplicate contacts within a provider
 *
 * Body:
 * - primaryContactId: ID of contact to keep
 * - mergeContactId: ID of contact to merge (will be deleted)
 * - providerId: ID of the provider (for validation)
 */
export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { primaryContactId, mergeContactId, providerId } = body

    if (!primaryContactId || !mergeContactId) {
      return NextResponse.json(
        { error: 'Both primaryContactId and mergeContactId are required' },
        { status: 400 }
      )
    }

    if (primaryContactId === mergeContactId) {
      return NextResponse.json(
        { error: 'Cannot merge a contact with itself' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Fetch both contacts and verify they belong to the same provider
    const [{ data: primaryContact }, { data: mergeContact }] = await Promise.all([
      supabase.from('linksy_provider_contacts').select('*').eq('id', primaryContactId).single(),
      supabase.from('linksy_provider_contacts').select('*').eq('id', mergeContactId).single(),
    ])

    if (!primaryContact || !mergeContact) {
      return NextResponse.json({ error: 'One or both contacts not found' }, { status: 404 })
    }

    if (primaryContact.provider_id !== mergeContact.provider_id) {
      return NextResponse.json(
        { error: 'Contacts must belong to the same provider' },
        { status: 400 }
      )
    }

    if (providerId && primaryContact.provider_id !== providerId) {
      return NextResponse.json(
        { error: 'Provider ID mismatch' },
        { status: 400 }
      )
    }

    // Step 1: Transfer special flags from merge contact to primary if needed
    const updates: Record<string, any> = {}

    // If merge contact is primary or default handler, transfer that status
    if (mergeContact.is_primary_contact && !primaryContact.is_primary_contact) {
      updates.is_primary_contact = true
    }
    if (mergeContact.is_default_referral_handler && !primaryContact.is_default_referral_handler) {
      updates.is_default_referral_handler = true
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('linksy_provider_contacts')
        .update(updates)
        .eq('id', primaryContactId)
    }

    // Step 2: Update references to the merge contact

    // 2a. Update tickets assigned to merge contact's user
    const { error: ticketsError } = await supabase
      .from('linksy_tickets')
      .update({ client_user_id: primaryContact.user_id })
      .eq('client_user_id', mergeContact.user_id)
      .eq('provider_id', primaryContact.provider_id)

    if (ticketsError) {
      console.error('Error updating tickets:', ticketsError)
    }

    // 2b. Update notes created by merge contact
    const { error: notesError } = await supabase
      .from('linksy_provider_notes')
      .update({ author_id: primaryContact.user_id })
      .eq('author_id', mergeContact.user_id)
      .eq('provider_id', primaryContact.provider_id)

    if (notesError) {
      console.error('Error updating notes:', notesError)
    }

    // Step 3: Delete the merge contact
    const { error: deleteError } = await supabase
      .from('linksy_provider_contacts')
      .delete()
      .eq('id', mergeContactId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete merged contact: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully merged contacts',
      primaryContactId,
    })
  } catch (error) {
    console.error('Contact merge error:', error)
    return NextResponse.json(
      { error: 'An error occurred while merging contacts' },
      { status: 500 }
    )
  }
}
