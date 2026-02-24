import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * POST /api/admin/providers/merge
 * Merge one provider into another
 *
 * Body:
 * - primaryProviderId: ID of provider to keep
 * - mergeProviderId: ID of provider to merge (will be deleted)
 * - fieldChoices: Object mapping field names to which provider ID to take the value from
 */
export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { primaryProviderId, mergeProviderId, fieldChoices } = body

    if (!primaryProviderId || !mergeProviderId) {
      return NextResponse.json(
        { error: 'Both primaryProviderId and mergeProviderId are required' },
        { status: 400 }
      )
    }

    if (primaryProviderId === mergeProviderId) {
      return NextResponse.json(
        { error: 'Cannot merge a provider with itself' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Fetch both providers
    const [{ data: primaryProvider }, { data: mergeProvider }] = await Promise.all([
      supabase.from('linksy_providers').select('*').eq('id', primaryProviderId).single(),
      supabase.from('linksy_providers').select('*').eq('id', mergeProviderId).single(),
    ])

    if (!primaryProvider || !mergeProvider) {
      return NextResponse.json({ error: 'One or both providers not found' }, { status: 404 })
    }

    // Step 1: Update primary provider with chosen field values
    const updates: Record<string, any> = {}
    if (fieldChoices) {
      for (const [field, chosenProviderId] of Object.entries(fieldChoices)) {
        if (chosenProviderId === mergeProviderId) {
          // Take value from merge provider
          updates[field] = mergeProvider[field]
        }
        // Otherwise keep primary provider's value (no update needed)
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('linksy_providers')
        .update(updates)
        .eq('id', primaryProviderId)

      if (updateError) {
        return NextResponse.json({ error: `Failed to update primary provider: ${updateError.message}` }, { status: 500 })
      }
    }

    // Step 2: Move all associated data from merge provider to primary provider

    // 2a. Move locations
    const { error: locationsError } = await supabase
      .from('linksy_locations')
      .update({ provider_id: primaryProviderId })
      .eq('provider_id', mergeProviderId)

    if (locationsError) {
      console.error('Error moving locations:', locationsError)
    }

    // 2b. Move contacts (but check for duplicates by user_id)
    const { data: mergeContacts } = await supabase
      .from('linksy_provider_contacts')
      .select('*')
      .eq('provider_id', mergeProviderId)

    if (mergeContacts && mergeContacts.length > 0) {
      const { data: existingContacts } = await supabase
        .from('linksy_provider_contacts')
        .select('user_id')
        .eq('provider_id', primaryProviderId)

      const existingUserIds = new Set((existingContacts || []).map(c => c.user_id))

      // Only move contacts that don't already exist in primary provider
      const contactsToMove = mergeContacts.filter(c => !existingUserIds.has(c.user_id))
      const contactIdsToMove = contactsToMove.map(c => c.id)

      if (contactIdsToMove.length > 0) {
        await supabase
          .from('linksy_provider_contacts')
          .update({ provider_id: primaryProviderId })
          .in('id', contactIdsToMove)
      }

      // Delete duplicate contacts
      const duplicateContactIds = mergeContacts
        .filter(c => existingUserIds.has(c.user_id))
        .map(c => c.id)

      if (duplicateContactIds.length > 0) {
        await supabase
          .from('linksy_provider_contacts')
          .delete()
          .in('id', duplicateContactIds)
      }
    }

    // 2c. Move notes
    const { error: notesError } = await supabase
      .from('linksy_provider_notes')
      .update({ provider_id: primaryProviderId })
      .eq('provider_id', mergeProviderId)

    if (notesError) {
      console.error('Error moving notes:', notesError)
    }

    // 2d. Move tickets
    const { error: ticketsError } = await supabase
      .from('linksy_tickets')
      .update({ provider_id: primaryProviderId })
      .eq('provider_id', mergeProviderId)

    if (ticketsError) {
      console.error('Error moving tickets:', ticketsError)
    }

    // 2e. Move events
    const { error: eventsError } = await supabase
      .from('linksy_provider_events')
      .update({ provider_id: primaryProviderId })
      .eq('provider_id', mergeProviderId)

    if (eventsError) {
      console.error('Error moving events:', eventsError)
    }

    // 2f. Merge provider needs (dedup by need_id)
    const { data: mergeNeeds } = await supabase
      .from('linksy_provider_needs')
      .select('need_id, source, is_confirmed')
      .eq('provider_id', mergeProviderId)

    if (mergeNeeds && mergeNeeds.length > 0) {
      const { data: existingNeeds } = await supabase
        .from('linksy_provider_needs')
        .select('need_id')
        .eq('provider_id', primaryProviderId)

      const existingNeedIds = new Set((existingNeeds || []).map(n => n.need_id))

      // Add needs that don't already exist
      const needsToAdd = mergeNeeds.filter(n => !existingNeedIds.has(n.need_id))

      if (needsToAdd.length > 0) {
        await supabase
          .from('linksy_provider_needs')
          .insert(
            needsToAdd.map(n => ({
              provider_id: primaryProviderId,
              need_id: n.need_id,
              source: n.source,
              is_confirmed: n.is_confirmed,
            }))
          )
      }

      // Delete all needs from merge provider
      await supabase
        .from('linksy_provider_needs')
        .delete()
        .eq('provider_id', mergeProviderId)
    }

    // 2g. Move interactions (analytics data)
    const { error: interactionsError } = await supabase
      .from('linksy_interactions')
      .update({ provider_id: primaryProviderId })
      .eq('provider_id', mergeProviderId)

    if (interactionsError) {
      console.error('Error moving interactions:', interactionsError)
    }

    // 2h. Update search session service_clicked references
    // This is stored as a JSONB array, so we need to update it manually
    const { data: sessions } = await supabase
      .from('linksy_search_sessions')
      .select('id, services_clicked')
      .contains('services_clicked', [mergeProviderId])

    if (sessions && sessions.length > 0) {
      for (const session of sessions) {
        const servicesClicked = (session.services_clicked || []) as string[]
        const updated = servicesClicked.map((id: string) =>
          id === mergeProviderId ? primaryProviderId : id
        )

        await supabase
          .from('linksy_search_sessions')
          .update({ services_clicked: updated })
          .eq('id', session.id)
      }
    }

    // Step 3: Delete the merged provider
    const { error: deleteError } = await supabase
      .from('linksy_providers')
      .delete()
      .eq('id', mergeProviderId)

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete merged provider: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged provider ${mergeProvider.name} into ${primaryProvider.name}`,
      primaryProviderId,
    })
  } catch (error) {
    console.error('Provider merge error:', error)
    return NextResponse.json(
      { error: 'An error occurred while merging providers' },
      { status: 500 }
    )
  }
}
