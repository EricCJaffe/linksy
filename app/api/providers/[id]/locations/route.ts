import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocode'

/**
 * POST /api/providers/[id]/locations
 * Add a location to a provider, auto-geocoding the address.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId } = params
  const body = await request.json()

  const supabase = await createServiceClient()

  // Build the address string and geocode it
  const addressString = buildAddressString({
    address_line1: body.address_line1,
    address_line2: body.address_line2,
    city: body.city,
    state: body.state,
    postal_code: body.postal_code || body.zip,
  })

  let geocodeFields: Record<string, any> = {}
  if (addressString) {
    const geo = await geocodeAddress(addressString)
    if (geo) {
      geocodeFields = {
        latitude: geo.latitude,
        longitude: geo.longitude,
        // PostGIS geography point: ST_SetSRID(ST_MakePoint(lng, lat), 4326)
        location: `POINT(${geo.longitude} ${geo.latitude})`,
        geocoded_at: new Date().toISOString(),
        geocode_source: 'google',
      }
    }
  }

  const { data: location, error: insertError } = await supabase
    .from('linksy_locations')
    .insert({
      provider_id: providerId,
      name: body.name || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      city: body.city || null,
      state: body.state || null,
      postal_code: body.postal_code || body.zip || null,
      phone: body.phone || null,
      is_primary: body.is_primary ?? false,
      ...geocodeFields,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(location, { status: 201 })
}

/**
 * PATCH /api/providers/[id]/locations/[locationId]
 * Update a location, re-geocoding if address fields changed.
 * (Handled in [locationId]/route.ts — this file only handles POST)
 */
