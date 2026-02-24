import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

interface ReassignRequest {
  target_provider_id: string
  target_contact_id?: string
  reason?: string
  notes?: string
  preserve_history?: boolean
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id
    const { data, error } = await requireSiteAdmin()
    if (error) return error
    const { user } = data

    const supabase = await createClient()
    const serviceClient = await createServiceClient()

    // Parse request body
    const body: ReassignRequest = await req.json()
    const {
      target_provider_id,
      target_contact_id,
      reason,
      notes,
      preserve_history = false,
    } = body

    // Validate required fields
    if (!target_provider_id) {
      return NextResponse.json(
        { error: 'Missing required field: target_provider_id' },
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

    // Verify target provider exists
    const { data: targetProvider, error: providerError } = await supabase
      .from('linksy_providers')
      .select('id, name')
      .eq('id', target_provider_id)
      .single()

    if (providerError || !targetProvider) {
      return NextResponse.json(
        { error: 'Target provider not found' },
        { status: 404 }
      )
    }

    // Determine assignee
    let assigneeUserId: string | null = null

    if (target_contact_id) {
      // Validate contact belongs to target provider
      const { data: contact } = await supabase
        .from('linksy_provider_contacts')
        .select('user_id')
        .eq('id', target_contact_id)
        .eq('provider_id', target_provider_id)
        .single()

      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found or does not belong to target provider' },
          { status: 400 }
        )
      }

      assigneeUserId = contact.user_id
    } else {
      // Auto-assign to default referral handler
      const { data: defaultHandler } = await serviceClient
        .from('linksy_provider_contacts')
        .select('user_id')
        .eq('provider_id', target_provider_id)
        .eq('is_default_referral_handler', true)
        .maybeSingle()

      assigneeUserId = defaultHandler?.user_id || null
    }

    // Prepare previous state for audit trail
    const previousState = {
      provider_id: ticket.provider_id,
      assigned_to: ticket.assigned_to,
      forwarded_from_provider_id: ticket.forwarded_from_provider_id,
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await serviceClient
      .from('linksy_tickets')
      .update({
        provider_id: target_provider_id,
        assigned_to: assigneeUserId,
        assigned_at: new Date().toISOString(),
        reassignment_count: ticket.reassignment_count + 1,
        last_reassigned_at: new Date().toISOString(),
        // Clear forwarding history unless preserve_history is true
        forwarded_from_provider_id: preserve_history
          ? ticket.forwarded_from_provider_id
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select(`
        *,
        provider:linksy_providers!provider_id(id, name)
      `)
      .single()

    if (updateError || !updatedTicket) {
      console.error('Error reassigning ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to reassign ticket' },
        { status: 500 }
      )
    }

    // Create event record
    await serviceClient.rpc('linksy_record_ticket_event', {
      p_ticket_id: ticketId,
      p_event_type: 'reassigned',
      p_actor_id: user.id,
      p_actor_type: 'site_admin',
      p_previous_state: previousState,
      p_new_state: {
        provider_id: target_provider_id,
        assigned_to: assigneeUserId,
      },
      p_reason: reason || 'admin_reassignment',
      p_notes: notes || null,
      p_metadata: JSON.stringify({
        preserve_history,
        target_contact_id: target_contact_id || null,
      }),
    })

    // Send notification to new assignee
    if (assigneeUserId) {
      void (async () => {
        // Fetch user's full_name for notification
        const { data: userProfile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single()

        const { sendTicketReassignedNotification } = await import('@/lib/utils/email')
        await sendTicketReassignedNotification({
          ticket: updatedTicket,
          assignee_user_id: assigneeUserId,
          reassignedBy: {
            email: user.email,
            full_name: userProfile?.full_name || null,
          },
          reason: reason || 'admin_reassignment',
          notes,
        })
      })()
    }

    // Fire webhook
    void (async () => {
      const { fireWebhook } = await import('@/lib/utils/webhooks')
      await fireWebhook('ticket.reassigned', ticket.site_id, {
        ticket_id: ticketId,
        target_provider_id,
        assigned_to: assigneeUserId,
        reassigned_by: user.id,
        reason: reason || 'admin_reassignment',
      })
    })()

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    })
  } catch (error) {
    console.error('Error reassigning ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
