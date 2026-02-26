import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

export async function GET(
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

    // Fetch ticket to verify access
    const { data: ticket, error: ticketError } = await supabase
      .from('linksy_tickets')
      .select('id, provider_id, site_id')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Authorization: Check if user has access to this ticket
    // Site admins see all events
    // Provider contacts see events for their tickets
    let hasAccess = isSiteAdmin

    if (!hasAccess && ticket.provider_id) {
      const { data: contact } = await supabase
        .from('linksy_provider_contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_id', ticket.provider_id)
        .single()

      hasAccess = !!contact
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch events
    const { data: events, error: eventsError } = await serviceClient
      .from('linksy_ticket_events')
      .select(`
        *,
        actor:users!actor_id(full_name, email)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (eventsError) {
      if (eventsError.code === 'PGRST205') {
        console.warn('[ticket events] table missing; returning empty list')
        return NextResponse.json({ events: [] })
      }
      console.error('Error fetching ticket events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch ticket events' },
        { status: 500 }
      )
    }

    return NextResponse.json({ events: events || [] })
  } catch (error) {
    console.error('Error fetching ticket events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
