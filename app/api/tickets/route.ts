import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireTenantAdmin } from '@/lib/middleware/auth'
import { sendNewTicketNotification } from '@/lib/utils/email'

export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || 'all'
  const providerId = searchParams.get('provider_id') || ''
  const needId = searchParams.get('need_id') || ''
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo = searchParams.get('date_to') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_tickets')
    .select(
      '*, linksy_providers!left(name), linksy_needs!left(name)',
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
    client_perception: t.client_perception,
    follow_up_sent: t.follow_up_sent,
    source: t.source,
    created_at: t.created_at,
    updated_at: t.updated_at,
    provider: t.linksy_providers ? { name: t.linksy_providers.name } : null,
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

  const { data: ticket, error: insertError } = await supabase
    .from('linksy_tickets')
    .insert({
      site_id: body.site_id,
      provider_id: body.provider_id || null,
      need_id: body.need_id || null,
      ticket_number: body.ticket_number,
      client_name: body.client_name || null,
      client_phone: body.client_phone || null,
      client_email: body.client_email || null,
      description_of_need: body.description_of_need || null,
      status: body.status || 'pending',
      source: body.source || null,
      client_user_id: defaultHandlerUserId,
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
        const [{ data: handlerUser }, { data: providerData }, { data: needData }] = await Promise.all([
          supabase.auth.admin.getUserById(defaultHandlerUserId),
          supabase.from('linksy_providers').select('name').eq('id', body.provider_id).single(),
          body.need_id
            ? supabase.from('linksy_needs').select('name').eq('id', body.need_id).single()
            : Promise.resolve({ data: null }),
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
          })
        }
      } catch (err) {
        console.error('[ticket email] Failed to send new ticket notification:', err)
      }
    })()
  }

  return NextResponse.json(ticket, { status: 201 })
}
