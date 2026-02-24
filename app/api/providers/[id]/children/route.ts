import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/providers/[id]/children
 * Get all child providers for a parent organization
 * Accessible to site admins and parent org admins
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const providerId = params.id
  const supabase = await createServiceClient()

  // Check if user has access to this provider
  const isSiteAdmin = auth.isSiteAdmin

  if (!isSiteAdmin) {
    // Check if user is a contact for this provider
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('contact_type, status')
      .eq('provider_id', providerId)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .single()

    if (!contact) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only admins can view children
    if (!['provider_admin', 'org_admin'].includes(contact.contact_type || '')) {
      return NextResponse.json(
        { error: 'Only administrators can view child organizations' },
        { status: 403 }
      )
    }
  }

  // Fetch all child providers
  const { data: children, error } = await supabase
    .from('linksy_providers')
    .select(`
      id,
      name,
      slug,
      sector,
      provider_status,
      accepting_referrals,
      phone,
      email,
      website,
      is_active,
      parent_linked_at,
      parent_linked_by,
      created_at,
      updated_at
    `)
    .eq('parent_provider_id', providerId)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get location counts for each child
  const childIds = children?.map((c) => c.id) || []
  let locationCounts: Record<string, number> = {}

  if (childIds.length > 0) {
    const { data: locations } = await supabase
      .from('linksy_locations')
      .select('provider_id')
      .in('provider_id', childIds)

    if (locations) {
      locationCounts = locations.reduce((acc, loc) => {
        acc[loc.provider_id] = (acc[loc.provider_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  // Enrich children with location counts
  const enrichedChildren = (children || []).map((child) => ({
    ...child,
    location_count: locationCounts[child.id] || 0,
  }))

  return NextResponse.json({
    parent_id: providerId,
    children: enrichedChildren,
    total_children: enrichedChildren.length,
  })
}
