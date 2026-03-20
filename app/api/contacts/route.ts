import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/contacts
 * List all provider contacts (site admin only)
 *
 * Query params:
 * - q: search by name or email
 * - status: filter by contact status (active, invited, pending, archived)
 * - offset: pagination offset (default 0)
 * - limit: pagination limit (default 50)
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || 'active'
  const providerId = searchParams.get('provider_id') || ''
  const role = searchParams.get('role') || ''
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo = searchParams.get('date_to') || ''
  const zip = searchParams.get('zip') || ''
  const offset = parseInt(searchParams.get('offset') || '0') || 0
  const limit = parseInt(searchParams.get('limit') || '50') || 50

  const supabase = await createServiceClient()

  // Base query: contacts with provider name
  let query = supabase
    .from('linksy_provider_contacts')
    .select(
      '*, provider:linksy_providers!provider_id(id, name, is_active)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Status filter
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // Search filter (name, email, job_title)
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,job_title.ilike.%${q}%`)
  }

  // Provider filter
  if (providerId) {
    query = query.eq('provider_id', providerId)
  }

  // Role filter
  if (role) {
    query = query.eq('provider_role', role)
  }

  // Date range filter
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
  }

  // Zip code filter: find contacts for providers with matching location postal_code
  if (zip) {
    const { data: zipLocations } = await supabase
      .from('linksy_locations')
      .select('provider_id')
      .eq('postal_code', zip)
    const zipProviderIds = (zipLocations || []).map((l: any) => l.provider_id).filter(Boolean)
    if (zipProviderIds.length === 0) {
      return NextResponse.json({
        contacts: [],
        pagination: { total: 0, offset, limit },
      })
    }
    query = query.in('provider_id', zipProviderIds)
  }

  const { data: contacts, count, error: fetchError } = await query

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Enrich contacts that have user_id with user data
  const enriched = await Promise.all(
    (contacts || []).map(async (contact) => {
      if (contact.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', contact.user_id)
          .single()
        return {
          ...contact,
          display_name: user?.full_name || contact.full_name || contact.email || 'Unknown',
          display_email: user?.email || contact.email || null,
        }
      }
      return {
        ...contact,
        display_name: contact.full_name || contact.email || 'Unknown',
        display_email: contact.email || null,
      }
    })
  )

  return NextResponse.json({
    contacts: enriched,
    pagination: {
      total: count || 0,
      offset,
      limit,
    },
  })
}
