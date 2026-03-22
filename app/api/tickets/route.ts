import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId, requireAuth, requireTenantAdmin } from '@/lib/middleware/auth'
import { sendNewTicketNotification } from '@/lib/utils/email'
import { sendWebhookEvent } from '@/lib/utils/webhooks'
import { checkDuplicateReferral } from '@/lib/utils/duplicate-detection'

/** Auto-detect test referrals by client name or explicit flag */
function isTestReferral(body: { client_name?: string | null; is_test?: boolean }): boolean {
  if (body.is_test) return true
  if (!body.client_name) return false
  return body.client_name.trim().toLowerCase() === 'mega coolmint'
}

export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || 'all'
  let providerId = searchParams.get('provider_id') || ''
  const needId = searchParams.get('need_id') || ''
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo = searchParams.get('date_to') || ''
  const clientEmail = searchParams.get('client_email') || ''
  const clientPhone = searchParams.get('client_phone') || ''
  const zip = searchParams.get('zip') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const supabase = await createServiceClient()

  // For non-admin users, enforce provider access: only return tickets for
  // providers the user is linked to via linksy_provider_contacts.
  let accessibleProviderIds: string[] | null = null
  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    const { data: contacts } = await supabase
      .from('linksy_provider_contacts')
      .select('provider_id')
      .eq('user_id', auth.user.id)
      .eq('status', 'active')

    accessibleProviderIds = (contacts || []).map(c => c.provider_id)

    if (accessibleProviderIds.length === 0) {
      return NextResponse.json({
        tickets: [],
        pagination: { total: 0, hasMore: false, nextOffset: null },
      })
    }

    // If a provider_id was requested, verify the user has access to it
    if (providerId && !accessibleProviderIds.includes(providerId)) {
      return NextResponse.json(
        { error: 'Forbidden - no access to this provider' },
        { status: 403 }
      )
    }

    // If no specific provider requested, scope to all accessible providers
    if (!providerId && accessibleProviderIds.length === 1) {
      providerId = accessibleProviderIds[0]
    }
  }

  let query = supabase
    .from('linksy_tickets')
    .select(
      '*, linksy_providers!provider_id(name, phone), linksy_needs!need_id(name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.ilike('client_name', `%${q}%`)
  }

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (providerId) {
    query = query.eq('provider_id', providerId)
  } else if (accessibleProviderIds && accessibleProviderIds.length > 0) {
    // Non-admin with multiple providers but no specific provider_id: filter to accessible
    query = query.in('provider_id', accessibleProviderIds)
  }

  if (needId) {
    query = query.eq('need_id', needId)
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  if (clientEmail) {
    query = query.ilike('client_email', `%${clientEmail}%`)
  }

  if (clientPhone) {
    query = query.ilike('client_phone', `%${clientPhone}%`)
  }

  // Zip code filter: find tickets for providers with matching location postal_code
  if (zip) {
    const { data: zipLocations } = await supabase
      .from('linksy_locations')
      .select('provider_id')
      .eq('postal_code', zip)
    const zipProviderIds = (zipLocations || []).map((l: any) => l.provider_id).filter(Boolean)
    if (zipProviderIds.length === 0) {
      return NextResponse.json({
        tickets: [],
        pagination: { total: 0, hasMore: false, nextOffset: null },
      })
    }
    query = query.in('provider_id', zipProviderIds)
  }

  const { data: tickets, count, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  const mapped = (tickets || []).map((t: any) => ({
    id: t.id,
    site_id: t.site_id,
    ticket_number: t.ticket_number,
    provider_id: t.provider_id,
    need_id: t.need_id,
    client_user_id: t.client_user_id,
    client_name: t.client_name,
    client_phone: t.client_phone,
    client_email: t.client_email,
    description_of_need: t.description_of_need,
    status: t.status,
    is_test: t.is_test ?? false,
    client_perception: t.client_perception,
    follow_up_sent: t.follow_up_sent,
    source: t.source,
    sla_due_at: t.sla_due_at,
    created_at: t.created_at,
    updated_at: t.updated_at,
    provider: t.linksy_providers ? { name: t.linksy_providers.name, phone: t.linksy_providers.phone ?? null } : null,
    need: t.linksy_needs ? { id: t.linksy_needs.id, name: t.linksy_needs.name } : null,
  }))

  const total = count || 0

  return NextResponse.json({
    tickets: mapped,
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
  const supabase = await createServiceClient()

  // Test referrals skip duplicate detection, rate limiting, and referral cap
  const isTest = isTestReferral(body)

  // Duplicate referral detection (TASK-029): same-day blocking, multi-provider flagging, consecutive-day warning
  let duplicateFlagType: string | null = null
  if (body.provider_id && !body.force && !isTest) {
    const dupCheck = await checkDuplicateReferral(supabase, {
      client_email: body.client_email,
      client_phone: body.client_phone,
      provider_id: body.provider_id,
      need_id: body.need_id,
    })

    if (dupCheck.blocked) {
      return NextResponse.json({
        error: 'Duplicate referral detected',
        duplicate: dupCheck.relatedTickets[0],
        message: dupCheck.message,
        flagType: dupCheck.flagType,
      }, { status: 409 })
    }
    // Case A and C are flagged but allowed — store flag on the ticket
    duplicateFlagType = dupCheck.flagType
  }

  // Rate limiting: max 5 tickets per email per hour
  if (body.client_email && !isTest) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('linksy_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('client_email', body.client_email)
      .gte('created_at', oneHourAgo)

    if ((recentCount ?? 0) >= 5) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: 'Too many referrals for this email address. Please wait before creating more.',
      }, { status: 429 })
    }
  }

  // Daily referral cap: max 2 referrals per client per day
  // Prevents clients from spamming providers with excessive referrals
  if ((body.client_email || body.client_phone) && !isTest) {
    const MAX_REFERRALS_PER_DAY = 2
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    const dailyOrConditions: string[] = []
    if (body.client_email) dailyOrConditions.push(`client_email.eq.${body.client_email}`)
    if (body.client_phone) dailyOrConditions.push(`client_phone.eq.${body.client_phone}`)

    const { count: dailyCount } = await supabase
      .from('linksy_tickets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO)
      .or(dailyOrConditions.join(','))

    if ((dailyCount ?? 0) >= MAX_REFERRALS_PER_DAY) {
      return NextResponse.json({
        error: 'Daily referral limit reached',
        message: `This client has reached the maximum of ${MAX_REFERRALS_PER_DAY} referral requests per day. Please try again tomorrow.`,
      }, { status: 429 })
    }
  }

  // Referral cap: max 4 active referrals per client (identified by email or phone)
  // Only count tickets that are still active (not closed/resolved)
  const MAX_REFERRALS_PER_CLIENT = 4
  if ((body.client_email || body.client_phone) && !isTest) {
    let capQuery = supabase
      .from('linksy_tickets')
      .select('id, ticket_number, provider_id, created_at', { count: 'exact', head: false })
      .in('status', ['pending', 'in_process'])  // Count pending and in-process tickets

    // Match by email OR phone (whichever is provided)
    const orConditions: string[] = []
    if (body.client_email) {
      orConditions.push(`client_email.eq.${body.client_email}`)
    }
    if (body.client_phone) {
      orConditions.push(`client_phone.eq.${body.client_phone}`)
    }
    if (orConditions.length > 0) {
      capQuery = capQuery.or(orConditions.join(','))
    }

    const { data: existingTickets, count: totalCount } = await capQuery

    if ((totalCount ?? 0) >= MAX_REFERRALS_PER_CLIENT) {
      return NextResponse.json({
        error: 'Referral cap exceeded',
        message: `This client has reached the maximum of ${MAX_REFERRALS_PER_CLIENT} active referrals. Please wait for existing referrals to be resolved before creating more.`,
        existingTickets: existingTickets?.map(t => ({
          ticket_number: t.ticket_number,
          provider_id: t.provider_id,
          created_at: t.created_at,
        })),
      }, { status: 429 })
    }
  }

  // Auto-assign to default referral handler if provider is specified
  let defaultHandlerUserId = body.client_user_id || null
  if (body.provider_id && !defaultHandlerUserId) {
    const { data: defaultContact } = await supabase
      .from('linksy_provider_contacts')
      .select('user_id')
      .eq('provider_id', body.provider_id)
      .eq('is_default_referral_handler', true)
      .single()

    if (defaultContact) {
      defaultHandlerUserId = defaultContact.user_id
    }
  }

  let ticketNumber = body.ticket_number
  if (!ticketNumber) {
    // Generate ticket number atomically via PostgreSQL sequence (prevents race conditions)
    const { data: seqResult, error: seqError } = await supabase.rpc(
      'linksy_next_ticket_number' as any
    )

    if (seqError || seqResult == null) {
      console.warn('Ticket sequence unavailable, using timestamp fallback:', seqError?.message)
      const fallbackSeq = Date.now() % 1000000
      const suffix = String(Math.floor(Math.random() * 100)).padStart(2, '0')
      ticketNumber = `R-${fallbackSeq}-${suffix}`
    } else {
      ticketNumber = seqResult as string
    }
  }

  const { data: ticket, error: insertError } = await supabase
    .from('linksy_tickets')
    .insert({
      site_id: body.site_id,
      provider_id: body.provider_id || null,
      need_id: body.need_id || null,
      ticket_number: ticketNumber,
      client_name: body.client_name || null,
      client_phone: body.client_phone || null,
      client_email: body.client_email || null,
      description_of_need: body.description_of_need || null,
      is_test: isTest,
      duplicate_flag_type: duplicateFlagType,
      status: body.status || 'pending',
      source: body.source || null,
      client_user_id: defaultHandlerUserId,
      custom_data: body.custom_data || {},
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Fire-and-forget: notify the default referral handler by email
  if (defaultHandlerUserId && body.provider_id) {
    void (async () => {
      try {
        const [{ data: handlerUser }, { data: providerData }, { data: needData }, { data: customFields }] = await Promise.all([
          supabase.auth.admin.getUserById(defaultHandlerUserId),
          supabase.from('linksy_providers').select('name').eq('id', body.provider_id).single(),
          body.need_id
            ? supabase.from('linksy_needs').select('name').eq('id', body.need_id).single()
            : Promise.resolve({ data: null }),
          supabase
            .from('linksy_host_custom_fields')
            .select('field_label, field_type')
            .eq('host_id', body.provider_id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ])

        const handlerEmail = handlerUser?.user?.email
        if (handlerEmail && handlerUser?.user) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          await sendNewTicketNotification({
            to: handlerEmail,
            contactName: handlerUser.user.user_metadata?.full_name || handlerEmail,
            ticketNumber: ticket.ticket_number || ticket.id,
            clientName: body.client_name || '',
            needName: (needData as any)?.name || '',
            description: body.description_of_need || '',
            providerName: (providerData as any)?.name || 'your organization',
            ticketUrl: `${appUrl}/dashboard/tickets/${ticket.id}`,
            customData: body.custom_data || ticket.custom_data,
            customFields: customFields || [],
            hostId: body.provider_id,
          })
        }
      } catch (err) {
        console.error('[ticket email] Failed to send new ticket notification:', err)
      }
    })()
  }

  // Resolve webhook tenant from provider's region tenant, falling back to auth context
  let webhookTenantId: string | null = null
  if (ticket.provider_id) {
    const { data: provider } = await supabase
      .from('linksy_providers')
      .select('tenant_id')
      .eq('id', ticket.provider_id)
      .single()
    webhookTenantId = provider?.tenant_id || null
  }
  if (!webhookTenantId) {
    webhookTenantId = getTenantId(auth)
  }

  if (webhookTenantId) {
    void sendWebhookEvent({
      tenantId: webhookTenantId,
      eventType: 'ticket.created',
      payload: {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        source: ticket.source,
        provider_id: ticket.provider_id,
        need_id: ticket.need_id,
        client_name: ticket.client_name,
        created_at: ticket.created_at,
      },
    }).catch((err) => {
      console.error('[webhook] failed to send ticket.created event:', err)
    })
  }

  return NextResponse.json(ticket, { status: 201 })
}
