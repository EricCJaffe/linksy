import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocode'

/**
 * POST /api/admin/geocode
 * Batch geocode all locations that haven't been geocoded yet.
 * Returns counts of processed / succeeded / failed.
 */
export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  // Fetch all ungeocoded locations that have enough address data
  const { data: locations, error: fetchError } = await supabase
    .from('linksy_locations')
    .select('id, address_line1, address_line2, city, state, postal_code')
    .is('geocoded_at', null)
    .not('address_line1', 'is', null)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  let succeeded = 0
  let failed = 0

  for (const loc of locations || []) {
    const addressString = buildAddressString(loc)
    if (!addressString) {
      failed++
      continue
    }

    const geo = await geocodeAddress(addressString)
    if (!geo) {
      failed++
      continue
    }

    const { error: updateError } = await supabase
      .from('linksy_locations')
      .update({
        latitude: geo.latitude,
        longitude: geo.longitude,
        location: `POINT(${geo.longitude} ${geo.latitude})`,
        geocoded_at: new Date().toISOString(),
        geocode_source: 'google',
      })
      .eq('id', loc.id)

    if (updateError) {
      failed++
    } else {
      succeeded++
    }

    // Respect Google Maps API rate limit: 50 req/s → small delay
    await new Promise((r) => setTimeout(r, 25))
  }

  return NextResponse.json({
    processed: (locations || []).length,
    succeeded,
    failed,
  })
}

/**
 * GET /api/admin/geocode
 * Return counts of geocoded vs ungeocoded locations.
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const [{ count: total }, { count: geocoded }] = await Promise.all([
    supabase.from('linksy_locations').select('id', { count: 'exact', head: true }),
    supabase.from('linksy_locations').select('id', { count: 'exact', head: true }).not('geocoded_at', 'is', null),
  ])

  return NextResponse.json({
    total: total ?? 0,
    geocoded: geocoded ?? 0,
    ungeocoded: (total ?? 0) - (geocoded ?? 0),
  })
}
