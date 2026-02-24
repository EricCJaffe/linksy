import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/providers/[id]/parent-stats
 * Get aggregated statistics for a parent organization across all children
 * Includes date range filtering
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const providerId = params.id
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const supabase = await createServiceClient()

  // Check if user has access to this provider
  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    const { data: hasAccess } = await supabase.rpc(
      'linksy_user_can_access_provider',
      {
        p_user_id: auth.user.id,
        p_provider_id: providerId,
      }
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Fetch the provider to get its name
  const { data: provider, error: providerError } = await supabase
    .from('linksy_providers')
    .select('id, name, parent_provider_id')
    .eq('id', providerId)
    .single()

  if (providerError || !provider) {
    return NextResponse.json(
      { error: 'Provider not found' },
      { status: 404 }
    )
  }

  // This endpoint only works for parent organizations (no parent_provider_id)
  if (provider.parent_provider_id !== null) {
    return NextResponse.json(
      {
        error:
          'This endpoint is only available for parent organizations. This provider is a child location.',
      },
      { status: 400 }
    )
  }

  // Fetch all children
  const { data: children } = await supabase
    .from('linksy_providers')
    .select('id, name, provider_status, is_active')
    .eq('parent_provider_id', providerId)

  const childrenList = children || []
  // All provider IDs: parent + children
  const allProviderIds = [providerId, ...childrenList.map((c) => c.id)]

  // Build date filters for queries
  const buildDateFilter = (query: any, dateField = 'created_at') => {
    if (dateFrom) {
      query = query.gte(dateField, dateFrom)
    }
    if (dateTo) {
      // Add one day to dateTo to make it inclusive
      const toDate = new Date(dateTo)
      toDate.setDate(toDate.getDate() + 1)
      query = query.lt(dateField, toDate.toISOString())
    }
    return query
  }

  // Fetch aggregated data in parallel
  const [
    ticketsResult,
    interactionsResult,
    eventsResult,
    notesResult,
    locationsResult,
  ] = await Promise.all([
    // Tickets (referrals)
    buildDateFilter(
      supabase
        .from('linksy_tickets')
        .select('id, provider_id, status, created_at')
        .in('provider_id', allProviderIds)
    ),

    // Interactions
    buildDateFilter(
      supabase
        .from('linksy_interactions')
        .select('id, provider_id, interaction_type, created_at')
        .in('provider_id', allProviderIds)
    ),

    // Events
    buildDateFilter(
      supabase
        .from('linksy_provider_events')
        .select('id, provider_id, status, event_date')
        .in('provider_id', allProviderIds),
      'event_date'
    ),

    // Notes
    buildDateFilter(
      supabase
        .from('linksy_provider_notes')
        .select('id, provider_id, note_type, created_at')
        .in('provider_id', allProviderIds)
    ),

    // Locations (not date-filtered)
    supabase
      .from('linksy_locations')
      .select('id, provider_id')
      .in('provider_id', allProviderIds),
  ])

  const tickets = ticketsResult.data || []
  const interactions = interactionsResult.data || []
  const events = eventsResult.data || []
  const notes = notesResult.data || []
  const locations = locationsResult.data || []

  // Calculate aggregated totals
  const totalReferrals = tickets.length
  const openReferrals = tickets.filter((t: any) => t.status === 'pending').length
  const closedReferrals = tickets.filter((t: any) => t.status !== 'pending').length

  const profileViews = interactions.filter(
    (i: any) => i.interaction_type === 'profile_view'
  ).length
  const phoneClicks = interactions.filter(
    (i: any) => i.interaction_type === 'phone_click'
  ).length
  const websiteClicks = interactions.filter(
    (i: any) => i.interaction_type === 'website_click'
  ).length
  const directionsClicks = interactions.filter(
    (i: any) => i.interaction_type === 'directions_click'
  ).length
  const totalInteractions = interactions.length

  const totalEvents = events.length
  const upcomingEvents = events.filter(
    (e: any) => e.status === 'approved' && new Date(e.event_date) > new Date()
  ).length

  const totalNotes = notes.length
  const totalLocations = locations.length

  // Calculate per-child stats
  const childrenStats = childrenList.map((child: any) => {
    const childTickets = tickets.filter((t: any) => t.provider_id === child.id)
    const childInteractions = interactions.filter(
      (i: any) => i.provider_id === child.id
    )
    const childEvents = events.filter((e: any) => e.provider_id === child.id)
    const childNotes = notes.filter((n: any) => n.provider_id === child.id)
    const childLocations = locations.filter((l: any) => l.provider_id === child.id)

    return {
      provider_id: child.id,
      provider_name: child.name,
      provider_status: child.provider_status,
      is_active: child.is_active,
      referral_count: childTickets.length,
      open_referrals: childTickets.filter((t: any) => t.status === 'pending').length,
      closed_referrals: childTickets.filter((t: any) => t.status !== 'pending')
        .length,
      interaction_count: childInteractions.length,
      profile_views: childInteractions.filter(
        (i: any) => i.interaction_type === 'profile_view'
      ).length,
      phone_clicks: childInteractions.filter(
        (i: any) => i.interaction_type === 'phone_click'
      ).length,
      website_clicks: childInteractions.filter(
        (i: any) => i.interaction_type === 'website_click'
      ).length,
      directions_clicks: childInteractions.filter(
        (i: any) => i.interaction_type === 'directions_click'
      ).length,
      event_count: childEvents.length,
      note_count: childNotes.length,
      location_count: childLocations.length,
    }
  })

  // Parent stats (for the parent itself, not including children)
  const parentTickets = tickets.filter((t: any) => t.provider_id === providerId)
  const parentInteractions = interactions.filter(
    (i: any) => i.provider_id === providerId
  )
  const parentEvents = events.filter((e: any) => e.provider_id === providerId)
  const parentNotes = notes.filter((n: any) => n.provider_id === providerId)
  const parentLocations = locations.filter((l: any) => l.provider_id === providerId)

  const parentStats = {
    provider_id: providerId,
    provider_name: provider.name,
    provider_status: (provider as any).provider_status,
    is_active: (provider as any).is_active,
    referral_count: parentTickets.length,
    open_referrals: parentTickets.filter((t: any) => t.status === 'pending').length,
    closed_referrals: parentTickets.filter((t: any) => t.status !== 'pending')
      .length,
    interaction_count: parentInteractions.length,
    profile_views: parentInteractions.filter(
      (i: any) => i.interaction_type === 'profile_view'
    ).length,
    phone_clicks: parentInteractions.filter(
      (i: any) => i.interaction_type === 'phone_click'
    ).length,
    website_clicks: parentInteractions.filter(
      (i: any) => i.interaction_type === 'website_click'
    ).length,
    directions_clicks: parentInteractions.filter(
      (i: any) => i.interaction_type === 'directions_click'
    ).length,
    event_count: parentEvents.length,
    note_count: parentNotes.length,
    location_count: parentLocations.length,
  }

  return NextResponse.json({
    parent_id: providerId,
    parent_name: provider.name,
    total_children: childrenList.length,
    date_range: {
      from: dateFrom,
      to: dateTo,
    },
    aggregated_metrics: {
      total_referrals: totalReferrals,
      open_referrals: openReferrals,
      closed_referrals: closedReferrals,
      total_interactions: totalInteractions,
      total_events: totalEvents,
      upcoming_events: upcomingEvents,
      total_notes: totalNotes,
      total_locations: totalLocations,
      combined_analytics: {
        profile_views: profileViews,
        phone_clicks: phoneClicks,
        website_clicks: websiteClicks,
        directions_clicks: directionsClicks,
      },
    },
    parent_stats: parentStats,
    children_stats: childrenStats,
  })
}
