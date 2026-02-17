import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocode'

/**
 * PATCH /api/providers/[id]/locations/[locationId]
 * Update a location. Re-geocodes if any address field changed.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; locationId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { locationId } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  // Fetch existing location to detect address changes
  const { data: existing, error: fetchError } = await supabase
    .from('linksy_locations')
    .select('*')
    .eq('id', locationId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const updates: Record<string, any> = {}

  const addressFields = ['address_line1', 'address_line2', 'city', 'state', 'postal_code'] as const
  for (const field of addressFields) {
    if (field in body) updates[field] = body[field] || null
  }
  if ('name' in body) updates.name = body.name || null
  if ('phone' in body) updates.phone = body.phone || null
  if ('is_primary' in body) updates.is_primary = body.is_primary

  // If any address field changed, re-geocode
  const addressChanged = addressFields.some(
    (f) => f in body && body[f] !== existing[f]
  )
  if (addressChanged) {
    const newAddress = buildAddressString({
      address_line1: updates.address_line1 ?? existing.address_line1,
      address_line2: updates.address_line2 ?? existing.address_line2,
      city: updates.city ?? existing.city,
      state: updates.state ?? existing.state,
      postal_code: updates.postal_code ?? existing.postal_code,
    })
    if (newAddress) {
      const geo = await geocodeAddress(newAddress)
      if (geo) {
        updates.latitude = geo.latitude
        updates.longitude = geo.longitude
        updates.location = `POINT(${geo.longitude} ${geo.latitude})`
        updates.geocoded_at = new Date().toISOString()
        updates.geocode_source = 'google'
      } else {
        // Address changed but geocoding failed — clear old coords
        updates.latitude = null
        updates.longitude = null
        updates.location = null
        updates.geocoded_at = null
        updates.geocode_source = null
      }
    }
  }

  const { data: location, error: updateError } = await supabase
    .from('linksy_locations')
    .update(updates)
    .eq('id', locationId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(location)
}

/**
 * DELETE /api/providers/[id]/locations/[locationId]
 * Remove a location from a provider.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; locationId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { locationId } = params
  const supabase = await createServiceClient()

  const { error: deleteError } = await supabase
    .from('linksy_locations')
    .delete()
    .eq('id', locationId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
