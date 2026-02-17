import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireTenantAdmin } from '@/lib/middleware/auth'

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
      '*, linksy_providers!left(name), linksy_needs!left(id, name), linksy_ticket_comments(*)'
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

  const allowedFields = [
    'status',
    'description_of_need',
    'client_name',
    'client_phone',
    'client_email',
    'follow_up_sent',
    'provider_id',
    'need_id',
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

  updates.updated_at = new Date().toISOString()

  const { data: ticket, error: updateError } = await supabase
    .from('linksy_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(ticket)
}
