import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAdmin } from '@/lib/middleware/auth'
import { sendTicketStatusNotification } from '@/lib/utils/email'
import type { TicketStatus } from '@/lib/types/linksy'

const validStatuses: TicketStatus[] = [
  'pending',
  'customer_need_addressed',
  'wrong_organization_referred',
  'outside_of_scope',
  'client_not_eligible',
  'unable_to_assist',
  'client_unresponsive',
]

/**
 * PATCH /api/tickets/bulk
 * Bulk update ticket statuses with automatic email notifications
 */
export async function PATCH(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { ids, status } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Fetch tickets before update to get email addresses and related data
  const { data: ticketsBeforeUpdate, error: fetchError } = await supabase
    .from('linksy_tickets')
    .select('id, client_email, client_name, ticket_number, provider_id, need_id')
    .in('id', ids)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Update ticket statuses
  const { error: updateError, count } = await supabase
    .from('linksy_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Fire-and-forget: Send email notifications to clients
  void (async () => {
    if (!ticketsBeforeUpdate || ticketsBeforeUpdate.length === 0) return

    for (const ticket of ticketsBeforeUpdate) {
      if (!ticket.client_email) continue

      try {
        // Fetch provider and need names for this ticket
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
          newStatus: status,
          providerName: (providerData as any)?.name || 'the provider',
          needName: (needData as any)?.name || 'your need',
        })
      } catch (err) {
        console.error(`[bulk ticket email] Failed to send notification for ticket ${ticket.id}:`, err)
      }
    }
  })()

  return NextResponse.json({
    updated: count ?? ids.length,
    emailsSent: ticketsBeforeUpdate?.filter(t => t.client_email).length || 0
  })
}
