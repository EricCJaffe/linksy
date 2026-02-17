/**
 * Server-side geocoding utility using Google Maps Geocoding API.
 * Never call this from client components — uses GOOGLE_MAPS_API_KEY.
 */

export interface GeocodeResult {
  latitude: number
  longitude: number
  formatted_address: string
}

/**
 * Geocode a street address to lat/lng.
 * Returns null if geocoding fails or the address is too vague.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set — skipping geocode')
    return null
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', apiKey)

  try {
    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      console.warn('Geocode failed:', data.status, address)
      return null
    }

    const { lat, lng } = data.results[0].geometry.location
    return {
      latitude: lat,
      longitude: lng,
      formatted_address: data.results[0].formatted_address,
    }
  } catch (err) {
    console.error('Geocode error:', err)
    return null
  }
}

/**
 * Build a full address string from location fields.
 */
export function buildAddressString(location: {
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
}): string {
  return [
    location.address_line1,
    location.address_line2,
    location.city,
    location.state,
    location.postal_code,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Build a Google Maps Static API image URL for a single marker.
 * Returns null if no coordinates are available.
 */
export function staticMapUrl(
  lat: number,
  lng: number,
  options: { width?: number; height?: number; zoom?: number } = {}
): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const { width = 600, height = 300, zoom = 14 } = options
  const center = `${lat},${lng}`
  const marker = `color:red|${lat},${lng}`

  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
  url.searchParams.set('center', center)
  url.searchParams.set('zoom', String(zoom))
  url.searchParams.set('size', `${width}x${height}`)
  url.searchParams.set('markers', marker)
  url.searchParams.set('key', apiKey)

  return url.toString()
}
