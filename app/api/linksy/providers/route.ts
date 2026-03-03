import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/linksy/providers
 * Public endpoint for browsing active providers.
 * Uses RLS-respecting client instead of service client.
 * Accepts optional `tenant_id` filter to scope results.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
  const tenantId = searchParams.get('tenant_id')

  const supabase = await createClient()

  let query = supabase
    .from('linksy_providers')
    .select(`
      id,
      name,
      description,
      sector,
      phone,
      email,
      website,
      hours_of_operation,
      referral_type,
      referral_instructions,
      is_active,
      locations:linksy_locations(
        id,
        name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        is_primary,
        latitude,
        longitude
      ),
      provider_needs:linksy_provider_needs(
        need_id,
        need:linksy_needs(id, name)
      )
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(limit)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: providers, error: queryError } = await query

  if (queryError) {
    console.error('Error fetching providers:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({
    providers: providers || [],
  })
}
