import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { geocodeAddress } from '@/lib/utils/geocode'

/**
 * PATCH /api/providers/[id]/events/[eventId]
 * Update an event
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; eventId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { eventId } = params
  const body = await request.json()

  const allowedFields = ['title', 'description', 'event_date', 'location', 'address', 'need_id', 'is_public', 'recurrence_rule', 'status']
  const updates: Record<string, any> = {}

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Re-geocode if address changed
  if ('address' in updates && updates.address) {
    const geo = await geocodeAddress(updates.address)
    if (geo) {
      updates.latitude = geo.latitude
      updates.longitude = geo.longitude
    } else {
      updates.latitude = null
      updates.longitude = null
    }
  }

  const supabase = await createServiceClient()

  const { data: event, error: updateError } = await supabase
    .from('linksy_provider_events')
    .update(updates)
    .eq('id', eventId)
    .select(`
      *,
      need:linksy_needs(name, category:linksy_need_categories(name))
    `)
    .single()

  if (updateError) {
    console.error('Error updating event:', updateError)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }

  return NextResponse.json(event)
}

/**
 * DELETE /api/providers/[id]/events/[eventId]
 * Delete an event
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; eventId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { eventId } = params
  const supabase = await createServiceClient()

  const { error: deleteError } = await supabase
    .from('linksy_provider_events')
    .delete()
    .eq('id', eventId)

  if (deleteError) {
    console.error('Error deleting event:', deleteError)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
