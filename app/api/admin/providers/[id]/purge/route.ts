import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * DELETE /api/admin/providers/[id]/purge
 * Permanently delete a provider and all associated data
 *
 * DANGER: This is irreversible and will delete:
 * - Provider record
 * - All locations
 * - All contacts
 * - All notes
 * - All tickets
 * - All events
 * - All provider needs associations
 * - All interactions
 * - Search session references
 * - Provider applications
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const providerId = params.id

  if (!providerId) {
    return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    // Step 1: Fetch the provider to confirm it exists
    const { data: provider, error: fetchError } = await supabase
      .from('linksy_providers')
      .select('id, name')
      .eq('id', providerId)
      .single()

    if (fetchError || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Step 2: Delete all associated data in the correct order
    // Note: Some tables may have ON DELETE CASCADE, but we'll be explicit

    // 2a. Delete interactions (analytics data)
    const { error: interactionsError } = await supabase
      .from('linksy_interactions')
      .delete()
      .eq('provider_id', providerId)

    if (interactionsError) {
      console.error('Error deleting interactions:', interactionsError)
    }

    // 2b. Update search session services_clicked references (JSONB array)
    const { data: sessions } = await supabase
      .from('linksy_search_sessions')
      .select('id, services_clicked')
      .contains('services_clicked', [providerId])

    if (sessions && sessions.length > 0) {
      for (const session of sessions) {
        const servicesClicked = (session.services_clicked || []) as string[]
        const updated = servicesClicked.filter((id: string) => id !== providerId)

        await supabase
          .from('linksy_search_sessions')
          .update({ services_clicked: updated })
          .eq('id', session.id)
      }
    }

    // 2c. Delete provider needs associations
    const { error: needsError } = await supabase
      .from('linksy_provider_needs')
      .delete()
      .eq('provider_id', providerId)

    if (needsError) {
      console.error('Error deleting provider needs:', needsError)
    }

    // 2d. Delete provider events
    const { error: eventsError } = await supabase
      .from('linksy_provider_events')
      .delete()
      .eq('provider_id', providerId)

    if (eventsError) {
      console.error('Error deleting events:', eventsError)
    }

    // 2e. Delete tickets
    const { error: ticketsError } = await supabase
      .from('linksy_tickets')
      .delete()
      .eq('provider_id', providerId)

    if (ticketsError) {
      console.error('Error deleting tickets:', ticketsError)
    }

    // 2f. Delete notes
    const { error: notesError } = await supabase
      .from('linksy_provider_notes')
      .delete()
      .eq('provider_id', providerId)

    if (notesError) {
      console.error('Error deleting notes:', notesError)
    }

    // 2g. Delete contacts
    const { error: contactsError } = await supabase
      .from('linksy_provider_contacts')
      .delete()
      .eq('provider_id', providerId)

    if (contactsError) {
      console.error('Error deleting contacts:', contactsError)
    }

    // 2h. Delete locations
    const { error: locationsError } = await supabase
      .from('linksy_locations')
      .delete()
      .eq('provider_id', providerId)

    if (locationsError) {
      console.error('Error deleting locations:', locationsError)
    }

    // 2i. Delete provider applications (if any exist for this provider)
    const { error: applicationsError } = await supabase
      .from('linksy_provider_applications')
      .delete()
      .eq('provider_id', providerId)

    if (applicationsError) {
      console.error('Error deleting applications:', applicationsError)
    }

    // Step 3: Finally, delete the provider itself
    const { error: deleteError } = await supabase
      .from('linksy_providers')
      .delete()
      .eq('id', providerId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete provider: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purged provider "${provider.name}" and all associated data`,
    })
  } catch (error) {
    console.error('Provider purge error:', error)
    return NextResponse.json(
      { error: 'An error occurred while purging the provider' },
      { status: 500 }
    )
  }
}
