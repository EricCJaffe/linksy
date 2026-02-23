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
        const noteUserId = (note as any).author_id ?? (note as any).user_id
        if (!noteUserId) {
          if ((note as any).author_name) {
            return {
              ...note,
              user: { full_name: (note as any).author_name, email: null },
            }
          }
          return { ...note, user: null }
        }
        const { data: user } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', noteUserId)
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

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const aPinned = a.is_pinned === true ? 1 : 0
    const bPinned = b.is_pinned === true ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const normalizedProvider = {
    ...provider,
    hours: provider.hours ?? provider.hours_of_operation ?? null,
    allow_auto_update:
      provider.allow_auto_update ?? provider.allow_auto_update_description ?? false,
    parent_account:
      provider.parent_account ??
      provider.parent_account_name ??
      provider.parent_provider_id ??
      null,
  }

  return NextResponse.json({
    ...normalizedProvider,
    locations: locationsRes.data || [],
    provider_needs: needsRes.data || [],
    notes: sortedNotes,
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
    // Compatibility with legacy provider schema names.
    'hours_of_operation',
    'social_facebook', 'social_instagram', 'social_twitter', 'social_linkedin',
    'referral_instructions',
  ]

  // Additional fields only admins can edit
  const adminOnlyFields = [
    'name', 'sector', 'is_active', 'referral_type', 'project_status',
    'allow_auto_update',
    // Compatibility with legacy provider schema names.
    'allow_auto_update_description',
    // Parent account compatibility: only applied if field exists in payload/UI.
    'parent_account', 'parent_account_name', 'parent_provider_id',
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
