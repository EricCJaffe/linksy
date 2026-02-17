import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/linksy/tickets
 * Public endpoint for creating referral tickets from search interface
 * No authentication required - this is for end users requesting help
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { provider_id, need_id, client_name, client_phone, client_email, description_of_need } = body

    // Validation
    if (!provider_id) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    if (!client_phone && !client_email) {
      return NextResponse.json(
        { error: 'Please provide either a phone number or email address' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Generate ticket number (format: LINK-YYYYMMDD-XXXX)
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')

    // Get count of tickets created today to generate sequential number
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
    const { count } = await supabase
      .from('linksy_tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay)

    const sequentialNumber = String((count || 0) + 1).padStart(4, '0')
    const ticketNumber = `LINK-${dateStr}-${sequentialNumber}`

    // Create the ticket
    const { data: ticket, error: insertError } = await supabase
      .from('linksy_tickets')
      .insert({
        site_id: null, // For now, not associating with a specific site
        provider_id,
        need_id: need_id || null,
        ticket_number: ticketNumber,
        client_name: client_name || null,
        client_phone: client_phone || null,
        client_email: client_email || null,
        description_of_need: description_of_need || null,
        status: 'pending',
        source: 'public_search',
      })
      .select('id, ticket_number')
      .single()

    if (insertError) {
      console.error('Error creating ticket:', insertError)
      return NextResponse.json({ error: 'Failed to create referral request' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ticket_number: ticket.ticket_number,
      message: 'Your referral request has been submitted successfully!',
    }, { status: 201 })
  } catch (error) {
    console.error('Ticket creation error:', error)
    return NextResponse.json(
      { error: 'An error occurred while creating your request' },
      { status: 500 }
    )
  }
}
