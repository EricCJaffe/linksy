import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

interface AssignRequest {
  assigned_to_user_id: string
  notes?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id
    const { data: authData, error: authError } = await requireAuth()
    if (authError) return authError
    const { user, isSiteAdmin } = authData

    const supabase = await createClient()
    const serviceClient = await createServiceClient()

    // Parse request body
    const body: AssignRequest = await req.json()
    const { assigned_to_user_id, notes } = body

    // Validate required fields
    if (!assigned_to_user_id) {
      return NextResponse.json(
        { error: 'Missing required field: assigned_to_user_id' },
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

    if (!ticket.provider_id) {
      return NextResponse.json(
        { error: 'Cannot assign internal contact to unassigned ticket' },
        { status: 400 }
      )
    }

    // Authorization: Check if user is provider admin or site admin
    let isAuthorized = isSiteAdmin

    if (!isAuthorized) {
      const { data: contact } = await supabase
        .from('linksy_provider_contacts')
        .select('provider_role')
        .eq('user_id', user.id)
        .eq('provider_id', ticket.provider_id)
        .single()

      isAuthorized = contact?.provider_role === 'admin'
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Only provider admins can assign tickets internally' },
        { status: 403 }
      )
    }

    // Verify target contact belongs to same provider
    const { data: targetContact } = await supabase
      .from('linksy_provider_contacts')
      .select('user_id, provider_id')
      .eq('user_id', assigned_to_user_id)
      .eq('provider_id', ticket.provider_id)
      .single()

    if (!targetContact) {
      return NextResponse.json(
        { error: 'Target contact not found or does not belong to this provider' },
        { status: 400 }
      )
    }

    // Prepare previous state for audit trail
    const previousState = {
      assigned_to: ticket.assigned_to,
    }

    // Update ticket (note: does NOT increment reassignment_count for internal assignments)
    const { data: updatedTicket, error: updateError } = await serviceClient
      .from('linksy_tickets')
      .update({
        assigned_to: assigned_to_user_id,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select(`
        *,
        provider:linksy_providers!provider_id(id, name)
      `)
      .single()

    if (updateError || !updatedTicket) {
      console.error('Error assigning ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to assign ticket' },
        { status: 500 }
      )
    }

    // Create event record
    await serviceClient.rpc('linksy_record_ticket_event', {
      p_ticket_id: ticketId,
      p_event_type: 'assigned',
      p_actor_id: user.id,
      p_actor_type: isSiteAdmin ? 'site_admin' : 'provider_admin',
      p_previous_state: previousState,
      p_new_state: {
        assigned_to: assigned_to_user_id,
      },
      p_reason: 'internal_assignment',
      p_notes: notes || null,
      p_metadata: JSON.stringify({ internal_assignment: true }),
    })

    // Send notification to new assignee
    void (async () => {
      // Fetch user's full_name for notification
      const { data: userProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const { sendTicketAssignedInternallyNotification } = await import('@/lib/utils/email')
      await sendTicketAssignedInternallyNotification({
        ticket: updatedTicket,
        assignee_user_id: assigned_to_user_id,
        assignedBy: {
          email: user.email,
          full_name: userProfile?.full_name || null,
        },
        notes,
      })
    })()

    // Fire webhook
    void (async () => {
      const { fireWebhook } = await import('@/lib/utils/webhooks')
      await fireWebhook('ticket.assigned', ticket.site_id, {
        ticket_id: ticketId,
        assigned_to: assigned_to_user_id,
        assigned_by: user.id,
      })
    })()

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    })
  } catch (error) {
    console.error('Error assigning ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
