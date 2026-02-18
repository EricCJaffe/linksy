import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { id } = params
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') // 'all', 'open', 'closed', or null
  const supabase = await createServiceClient()

  // Fetch provider
  const { data: provider, error: providerError } = await supabase
    .from('linksy_providers')
    .select('*')
    .eq('id', id)
    .single()

  if (providerError || !provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  // Build tickets query with optional status filter
  let ticketsQuery = supabase
    .from('linksy_tickets')
    .select('*, need:linksy_needs(id, name)')
    .eq('provider_id', id)
    .order('created_at', { ascending: false })

  // Apply status filter
  if (statusFilter === 'open') {
    ticketsQuery = ticketsQuery.eq('status', 'pending')
  } else if (statusFilter === 'closed') {
    ticketsQuery = ticketsQuery.in('status', [
      'customer_need_addressed',
      'unable_to_assist',
      'client_unresponsive',
      'wrong_organization_referred',
      'outside_of_scope',
      'client_not_eligible'
    ])
  }
  // 'all' or null = no filter, show all statuses

  // Fetch relations in parallel
  const [locationsRes, needsRes, notesRes, ticketsRes, contactsRes, eventsRes] = await Promise.all([
    supabase
      .from('linksy_locations')
      .select('*')
      .eq('provider_id', id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('linksy_provider_needs')
      .select('*, need:linksy_needs(id, name, category_id, is_active, category:linksy_need_categories(id, name))')
      .eq('provider_id', id),
    supabase
      .from('linksy_provider_notes')
      .select('*')
      .eq('provider_id', id)
      .order('created_at', { ascending: false }),
    ticketsQuery,
    supabase
      .from('linksy_provider_contacts')
      .select('*')
      .eq('provider_id', id)
      .eq('status', 'active')
      .order('is_primary_contact', { ascending: false }),
    supabase
      .from('linksy_provider_events')
      .select('*')
      .eq('provider_id', id)
      .order('event_date', { ascending: true }),
  ])

  // Manually fetch user data for contacts and notes to work around schema cache issue
  const [contactsWithUsers, notesWithUsers] = await Promise.all([
    Promise.all(
      (contactsRes.data || []).map(async (contact) => {
        const { data: user } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', contact.user_id)
          .single()

        return { ...contact, user }
      })
    ),
    Promise.all(
      (notesRes.data || []).map(async (note) => {
        if (!note.user_id) {
          return { ...note, user: null }
        }
        const { data: user } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', note.user_id)
          .maybeSingle()

        return { ...note, user }
      })
    ),
  ])

  const isContactForThisProvider = (contactsRes.data || []).some(
    (c) => c.user_id === auth.user.id
  )
  const canSeePrivate = auth.isSiteAdmin || auth.isTenantAdmin || isContactForThisProvider

  const filteredNotes = canSeePrivate
    ? notesWithUsers
    : notesWithUsers.filter((n) => !n.is_private)

  return NextResponse.json({
    ...provider,
    locations: locationsRes.data || [],
    provider_needs: needsRes.data || [],
    notes: filteredNotes,
    tickets: ticketsRes.data || [],
    contacts: contactsWithUsers,
    events: eventsRes.data || [],
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { id } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  // Fields any active provider contact can edit
  const staffFields = [
    'description', 'phone', 'email', 'website', 'hours',
    'social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin',
    'referral_instructions',
  ]

  // Additional fields only admins can edit
  const adminOnlyFields = [
    'name', 'sector', 'is_active', 'referral_type', 'project_status',
    'allow_auto_update',
    'is_host', 'host_embed_active', 'host_widget_config', 'host_monthly_token_budget',
  ]

  let allowedFields: string[]

  if (auth.isSiteAdmin || auth.isTenantAdmin) {
    allowedFields = [...staffFields, ...adminOnlyFields]
  } else {
    // Check if user is an active contact for this provider
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('id')
      .eq('provider_id', id)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    allowedFields = staffFields
  }

  const updates: Record<string, any> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: provider, error: updateError } = await supabase
    .from('linksy_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(provider)
}
