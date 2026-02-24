import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

interface ForwardRequest {
  action: 'forward_to_admin' | 'forward_to_provider'
  target_provider_id?: string
  reason: 'unable_to_assist' | 'wrong_org' | 'capacity' | 'other'
  notes?: string
  new_status?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id
    const authResult = await requireAuth(req)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createClient()
    const serviceClient = createServiceClient()

    // Parse request body
    const body: ForwardRequest = await req.json()
    const { action, target_provider_id, reason, notes, new_status } = body

    // Validate required fields
    if (!action || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: action, reason' },
        { status: 400 }
      )
    }

    if (action === 'forward_to_provider' && !target_provider_id) {
      return NextResponse.json(
        { error: 'target_provider_id required when forwarding to provider' },
        { status: 400 }
      )
    }

    // Fetch current ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('linksy_tickets')
      .select(`
        *,
        provider:linksy_providers!provider_id(id, name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Authorization: Check if user is a contact for this ticket's provider
    if (!user.is_site_admin) {
      const { data: contact } = await supabase
        .from('linksy_provider_contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_id', ticket.provider_id)
        .single()

      if (!contact) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only forward tickets for your own provider' },
          { status: 403 }
        )
      }
    }

    // Prepare previous state for audit trail
    const previousState = {
      provider_id: ticket.provider_id,
      assigned_to: ticket.assigned_to,
      status: ticket.status,
    }

    let updatedTicket: any

    if (action === 'forward_to_admin') {
      // Forward to admin: orphan the ticket
      const { data, error } = await serviceClient
        .from('linksy_tickets')
        .update({
          provider_id: null,
          assigned_to: null,
          assigned_at: null,
          forwarded_from_provider_id: ticket.provider_id,
          reassignment_count: ticket.reassignment_count + 1,
          last_reassigned_at: new Date().toISOString(),
          status: new_status || ticket.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single()

      if (error) {
        console.error('Error forwarding ticket to admin:', error)
        return NextResponse.json(
          { error: 'Failed to forward ticket' },
          { status: 500 }
        )
      }

      updatedTicket = data

      // Create event record
      await serviceClient.rpc('linksy_record_ticket_event', {
        p_ticket_id: ticketId,
        p_event_type: 'forwarded',
        p_actor_id: user.id,
        p_actor_type: user.is_site_admin ? 'site_admin' : 'provider_contact',
        p_previous_state: previousState,
        p_new_state: {
          provider_id: null,
          assigned_to: null,
          forwarded_from_provider_id: ticket.provider_id,
        },
        p_reason: reason,
        p_notes: notes || null,
        p_metadata: JSON.stringify({ action: 'forward_to_admin' }),
      })

      // Send notification to site admins
      void (async () => {
        const { sendTicketForwardedToAdminNotification } = await import('@/lib/utils/email')
        await sendTicketForwardedToAdminNotification({
          ticket: updatedTicket,
          forwardedBy: user,
          reason,
          notes,
        })
      })()

      // Fire webhook
      void (async () => {
        const { fireWebhook } = await import('@/lib/utils/webhooks')
        await fireWebhook('ticket.forwarded', ticket.site_id, {
          ticket_id: ticketId,
          action: 'forward_to_admin',
          forwarded_by: user.id,
          reason,
        })
      })()
    } else {
      // Forward to provider: assign to target's default handler
      if (!target_provider_id) {
        return NextResponse.json(
          { error: 'target_provider_id required' },
          { status: 400 }
        )
      }

      // Get target provider's default referral handler
      const { data: defaultHandler } = await serviceClient
        .from('linksy_provider_contacts')
        .select('user_id')
        .eq('provider_id', target_provider_id)
        .eq('is_default_referral_handler', true)
        .maybeSingle()

      const { data, error } = await serviceClient
        .from('linksy_tickets')
        .update({
          provider_id: target_provider_id,
          assigned_to: defaultHandler?.user_id || null,
          assigned_at: new Date().toISOString(),
          reassignment_count: ticket.reassignment_count + 1,
          last_reassigned_at: new Date().toISOString(),
          forwarded_from_provider_id: null, // Clear if previously forwarded
          status: new_status || ticket.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select(`
          *,
          provider:linksy_providers!provider_id(id, name)
        `)
        .single()

      if (error) {
        console.error('Error forwarding ticket to provider:', error)
        return NextResponse.json(
          { error: 'Failed to forward ticket' },
          { status: 500 }
        )
      }

      updatedTicket = data

      // Create event record
      await serviceClient.rpc('linksy_record_ticket_event', {
        p_ticket_id: ticketId,
        p_event_type: 'forwarded',
        p_actor_id: user.id,
        p_actor_type: user.is_site_admin ? 'site_admin' : 'provider_contact',
        p_previous_state: previousState,
        p_new_state: {
          provider_id: target_provider_id,
          assigned_to: defaultHandler?.user_id || null,
        },
        p_reason: reason,
        p_notes: notes || null,
        p_metadata: JSON.stringify({
          action: 'forward_to_provider',
          target_provider_id,
        }),
      })

      // Send notification to new assignee
      if (defaultHandler?.user_id) {
        void (async () => {
          const { sendTicketReassignedNotification } = await import('@/lib/utils/email')
          await sendTicketReassignedNotification({
            ticket: updatedTicket,
            assignee_user_id: defaultHandler.user_id,
            reassignedBy: user,
            reason,
            notes,
          })
        })()
      }

      // Fire webhook
      void (async () => {
        const { fireWebhook } = await import('@/lib/utils/webhooks')
        await fireWebhook('ticket.forwarded', ticket.site_id, {
          ticket_id: ticketId,
          action: 'forward_to_provider',
          target_provider_id,
          forwarded_by: user.id,
          reason,
        })
      })()
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    })
  } catch (error) {
    console.error('Error forwarding ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
