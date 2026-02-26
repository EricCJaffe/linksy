import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId, requireAuth, requireTenantAdmin } from '@/lib/middleware/auth'
import { sendTicketStatusNotification } from '@/lib/utils/email'
import { sendWebhookEvent } from '@/lib/utils/webhooks'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { id } = params
  const supabase = await createServiceClient()

  const { data: ticket, error: queryError } = await supabase
    .from('linksy_tickets')
    .select(
      '*, linksy_providers!provider_id(name), linksy_needs!need_id(id, name), linksy_ticket_comments(*)'
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'linksy_ticket_comments', ascending: true })
    .single()

  if (queryError) {
    if (queryError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  const mapped = {
    id: ticket.id,
    site_id: ticket.site_id,
    ticket_number: ticket.ticket_number,
    provider_id: ticket.provider_id,
    need_id: ticket.need_id,
    client_user_id: ticket.client_user_id,
    client_name: ticket.client_name,
    client_phone: ticket.client_phone,
    client_email: ticket.client_email,
    description_of_need: ticket.description_of_need,
    status: ticket.status,
    client_perception: ticket.client_perception,
    follow_up_sent: ticket.follow_up_sent,
    source: ticket.source,
    search_session_id: ticket.search_session_id,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    provider: (ticket as any).linksy_providers
      ? { name: (ticket as any).linksy_providers.name }
      : null,
    need: (ticket as any).linksy_needs
      ? { id: (ticket as any).linksy_needs.id, name: (ticket as any).linksy_needs.name }
      : null,
    comments: ((ticket as any).linksy_ticket_comments || [])
      .filter((c: any) => !c.is_private || auth.isSiteAdmin)
      .map((c: any) => ({
        id: c.id,
        ticket_id: c.ticket_id,
        author_id: c.author_id,
        content: c.content,
        is_private: c.is_private,
        author_name: c.author_name,
        author_role: c.author_role,
        created_at: c.created_at,
      })),
  }

  return NextResponse.json(mapped)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const { id } = params
  const body = await request.json()
  const supabase = await createServiceClient()
  const tenantId = getTenantId(auth)

  const allowedFields = [
    'status',
    'description_of_need',
    'client_name',
    'client_phone',
    'client_email',
    'follow_up_sent',
    'provider_id',
    'need_id',
    'client_user_id',
  ]

  const updates: Record<string, any> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  if ('client_user_id' in updates) {
    updates.assigned_to = updates.client_user_id
    updates.assigned_at = new Date().toISOString()
  }

  updates.updated_at = new Date().toISOString()

  const { data: previousTicket } = await supabase
    .from('linksy_tickets')
    .select('status')
    .eq('id', id)
    .single()

  const { data: ticket, error: updateError } = await supabase
    .from('linksy_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Fire-and-forget: notify client if status changed and they have an email
  if (updates.status && ticket.client_email) {
    void (async () => {
      try {
        const [{ data: providerData }, { data: needData }] = await Promise.all([
          ticket.provider_id
            ? supabase.from('linksy_providers').select('name').eq('id', ticket.provider_id).single()
            : Promise.resolve({ data: null }),
          ticket.need_id
            ? supabase.from('linksy_needs').select('name').eq('id', ticket.need_id).single()
            : Promise.resolve({ data: null }),
        ])

        await sendTicketStatusNotification({
          to: ticket.client_email,
          clientName: ticket.client_name || '',
          ticketNumber: ticket.ticket_number || ticket.id,
          newStatus: updates.status,
          providerName: (providerData as any)?.name || 'the provider',
          needName: (needData as any)?.name || 'your need',
          hostId: ticket.provider_id || undefined,
        })
      } catch (err) {
        console.error('[ticket email] Failed to send status notification:', err)
      }
    })()
  }

  if (updates.status && previousTicket && previousTicket.status !== updates.status) {
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
      webhookTenantId = tenantId
    }

    if (webhookTenantId) {
      console.log('[webhook] enqueue ticket.status_changed', {
        ticket_number: ticket.ticket_number,
        tenant_id: webhookTenantId,
      })
      void sendWebhookEvent({
        tenantId: webhookTenantId,
        eventType: 'ticket.status_changed',
        payload: {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          previous_status: previousTicket.status,
          new_status: updates.status,
          source: ticket.source,
          provider_id: ticket.provider_id,
          need_id: ticket.need_id,
          client_name: ticket.client_name,
          updated_at: ticket.updated_at,
        },
      }).catch((err) => {
        console.error('[webhook] failed to send ticket.status_changed event:', err)
      })
    } else {
      console.warn('[webhook] skipped ticket.status_changed - missing tenant_id', {
        ticket_id: ticket.id,
        provider_id: ticket.provider_id,
      })
    }
  } else if (updates.status) {
    console.log('[webhook] status change not detected', {
      ticket_id: ticket.id,
      previous_status: previousTicket?.status ?? null,
      new_status: updates.status,
    })
  }

  return NextResponse.json(ticket)
}
