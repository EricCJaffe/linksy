import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { geocodeAddress } from '@/lib/utils/geocode'

/**
 * GET /api/providers/[id]/events
 * List events for a provider
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { id } = params
  const supabase = await createServiceClient()

  const { data: events, error: eventsError } = await supabase
    .from('linksy_provider_events')
    .select(`
      *,
      need:linksy_needs(name, category:linksy_need_categories(name))
    `)
    .eq('provider_id', id)
    .order('event_date', { ascending: true })

  if (eventsError) {
    console.error('Error fetching events:', eventsError)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }

  return NextResponse.json(events)
}

/**
 * POST /api/providers/[id]/events
 * Create a new event for a provider
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId } = params
  const body = await request.json()
  const { title, description, event_date, location, address, need_id, is_public, recurrence_rule } = body

  if (!title || !event_date) {
    return NextResponse.json(
      { error: 'Title and event date are required' },
      { status: 400 }
    )
  }

  if (!address) {
    return NextResponse.json(
      { error: 'Address is required' },
      { status: 400 }
    )
  }

  if (!need_id) {
    return NextResponse.json(
      { error: 'Service category is required' },
      { status: 400 }
    )
  }

  // Geocode the address for proximity search
  let latitude: number | null = null
  let longitude: number | null = null
  const geo = await geocodeAddress(address)
  if (geo) {
    latitude = geo.latitude
    longitude = geo.longitude
  }

  const supabase = await createServiceClient()

  const { data: event, error: createError } = await supabase
    .from('linksy_provider_events')
    .insert({
      provider_id: providerId,
      title,
      description: description || null,
      event_date,
      location: location || null,
      address,
      latitude,
      longitude,
      need_id,
      is_public: is_public || false,
      recurrence_rule: recurrence_rule || null,
      created_by: auth.user.id,
      status: 'pending',
    })
    .select(`
      *,
      need:linksy_needs(name, category:linksy_need_categories(name))
    `)
    .single()

  if (createError) {
    console.error('Error creating event:', createError)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }

  return NextResponse.json(event, { status: 201 })
}
