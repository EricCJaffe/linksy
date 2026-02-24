import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireTenantAdmin } from '@/lib/middleware/auth'

export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const sector = searchParams.get('sector') || 'all'
  const status = searchParams.get('status') || 'active'
  const referralType = searchParams.get('referral_type') || 'all'
  const organizationType = searchParams.get('organization_type') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // Proximity search params
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const radiusMilesParam = searchParams.get('radius_miles')
  const lat = latParam ? parseFloat(latParam) : null
  const lng = lngParam ? parseFloat(lngParam) : null
  const radiusMiles = radiusMilesParam ? parseFloat(radiusMilesParam) : null

  const supabase = await createServiceClient()

  // If proximity params are given, fetch the matching provider IDs first
  let proximityIds: string[] | null = null
  if (lat !== null && lng !== null && radiusMiles !== null && !isNaN(lat) && !isNaN(lng) && !isNaN(radiusMiles)) {
    const radiusMeters = radiusMiles * 1609.34
    const { data: nearby, error: rpcError } = await supabase.rpc('linksy_nearby_provider_ids', {
      lat,
      lng,
      radius_meters: radiusMeters,
    })
    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }
    proximityIds = (nearby || []) as string[]
  }

  let query = supabase
    .from('linksy_providers')
    .select('*, linksy_locations(id), linksy_provider_needs(id)', { count: 'exact' })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  if (sector !== 'all') {
    query = query.eq('sector', sector)
  }

  if (status === 'active') {
    query = query.eq('provider_status', 'active')
  } else if (status === 'paused') {
    query = query.eq('provider_status', 'paused')
  } else if (status === 'inactive') {
    query = query.eq('provider_status', 'inactive')
  }

  if (referralType !== 'all') {
    query = query.eq('referral_type', referralType)
  }

  // Organization type filter (parent/child/standalone)
  if (organizationType === 'parent') {
    // Parent orgs: has at least one child (we'll filter this after the query)
    // For now, exclude providers that have a parent
    query = query.is('parent_provider_id', null)
  } else if (organizationType === 'child') {
    // Child orgs: has a parent
    query = query.not('parent_provider_id', 'is', null)
  } else if (organizationType === 'standalone') {
    // Standalone: no parent and no children (we'll filter this after the query)
    query = query.is('parent_provider_id', null)
  }

  if (proximityIds !== null) {
    if (proximityIds.length === 0) {
      // No providers within radius — short-circuit
      return NextResponse.json({
        providers: [],
        pagination: { total: 0, hasMore: false, nextOffset: null },
      })
    }
    query = query.in('id', proximityIds)
  }

  const { data: providers, count, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  // For parent/standalone filtering, get all provider IDs that have children
  let parentProviderIds: Set<string> | null = null
  if (organizationType === 'parent' || organizationType === 'standalone') {
    const { data: childData } = await supabase
      .from('linksy_providers')
      .select('parent_provider_id')
      .not('parent_provider_id', 'is', null)

    if (childData) {
      parentProviderIds = new Set(childData.map((c) => c.parent_provider_id).filter(Boolean))
    }
  }

  // Map to include counts and parent_provider_id
  let mapped = (providers || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    sector: p.sector,
    phone: p.phone,
    email: p.email,
    website: p.website,
    hours: p.hours ?? p.hours_of_operation ?? null,
    is_active: p.is_active,
    provider_status: p.provider_status,
    accepting_referrals: p.accepting_referrals,
    referral_type: p.referral_type,
    referral_instructions: p.referral_instructions,
    project_status: p.project_status,
    allow_auto_update: p.allow_auto_update ?? p.allow_auto_update_description ?? false,
    parent_provider_id: p.parent_provider_id,
    created_at: p.created_at,
    updated_at: p.updated_at,
    location_count: p.linksy_locations?.length || 0,
    need_count: p.linksy_provider_needs?.length || 0,
  }))

  // Apply post-query organization type filtering
  if (organizationType === 'parent' && parentProviderIds) {
    mapped = mapped.filter((p) => parentProviderIds!.has(p.id))
  } else if (organizationType === 'standalone' && parentProviderIds) {
    mapped = mapped.filter((p) => !p.parent_provider_id && !parentProviderIds!.has(p.id))
  }

  const total = count || 0

  return NextResponse.json({
    providers: mapped,
    pagination: {
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
    },
  })
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { name, description, sector, phone, email, website, hours,
          project_status, referral_type, referral_instructions, is_active,
          provider_status, accepting_referrals } = body

  if (!name || !sector) {
    return NextResponse.json({ error: 'name and sector are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Generate a unique slug from the name
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data: existing } = await supabase
    .from('linksy_providers')
    .select('slug')
    .ilike('slug', `${base}%`)

  const usedSlugs = new Set((existing || []).map((r: any) => r.slug))
  let slug = base
  let i = 2
  while (usedSlugs.has(slug)) {
    slug = `${base}-${i++}`
  }

  const { data: provider, error: insertError } = await supabase
    .from('linksy_providers')
    .insert({
      name,
      slug,
      description: description || null,
      sector,
      phone: phone || null,
      email: email || null,
      website: website || null,
      hours: hours || null,
      project_status: project_status || 'active',
      referral_type: referral_type || 'standard',
      referral_instructions: referral_instructions || null,
      is_active: is_active ?? true,
      provider_status: provider_status || 'active',
      accepting_referrals: accepting_referrals ?? true,
      allow_auto_update: false,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(provider, { status: 201 })
}
