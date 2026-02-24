import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

/**
 * POST /api/linksy/tickets
 * Public endpoint for creating referral tickets from search interface
 * No authentication required - this is for end users requesting help
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      provider_id,
      need_id,
      client_name,
      client_phone,
      client_email,
      description_of_need,
      host_provider_id,
      search_session_id,
      custom_data,
    } = body

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

    // Optional host-context controls for public ticket creation
    if (host_provider_id) {
      const { data: host, error: hostError } = await supabase
        .from('linksy_providers')
        .select(
          'id, is_host, is_active, host_embed_active, host_widget_config'
        )
        .eq('id', host_provider_id)
        .single()

      if (hostError || !host || !host.is_host || !host.is_active || !host.host_embed_active) {
        return NextResponse.json({ error: 'Invalid or inactive host context' }, { status: 403 })
      }

      const hostConfig = (host.host_widget_config || {}) as Record<string, any>
      const perHourLimit =
        typeof hostConfig.ticket_rate_limit_per_hour === 'number' &&
        hostConfig.ticket_rate_limit_per_hour > 0
          ? hostConfig.ticket_rate_limit_per_hour
          : 20

      const forwardedFor = request.headers.get('x-forwarded-for')
      const requestIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
      const rateLimit = checkRateLimit(`host-ticket:${host_provider_id}:${requestIp}`, perHourLimit, 60 * 60 * 1000)

      if (!rateLimit.success) {
        return NextResponse.json(
          { error: 'Referral request rate limit exceeded for this host. Please try again later.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimit.limit.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.reset.toISOString(),
            },
          }
        )
      }
    }

    // Referral cap: max 4 active referrals per client (identified by email or phone)
    // Only count tickets that are still active (not closed/resolved)
    const MAX_REFERRALS_PER_CLIENT = 4
    let capQuery = supabase
      .from('linksy_tickets')
      .select('id, ticket_number, provider_id, created_at', { count: 'exact', head: false })
      .in('status', ['pending'])  // Only count pending/active tickets

    // Match by email OR phone (whichever is provided)
    const orConditions: string[] = []
    if (client_email) {
      orConditions.push(`client_email.eq.${client_email}`)
    }
    if (client_phone) {
      orConditions.push(`client_phone.eq.${client_phone}`)
    }
    if (orConditions.length > 0) {
      capQuery = capQuery.or(orConditions.join(','))
    }

    const { data: existingTickets, count: totalCount } = await capQuery

    if ((totalCount ?? 0) >= MAX_REFERRALS_PER_CLIENT) {
      return NextResponse.json({
        error: 'Referral cap exceeded',
        message: `You have reached the maximum of ${MAX_REFERRALS_PER_CLIENT} active referrals. Please wait for your existing referrals to be processed before requesting more help.`,
        existingTicketsCount: totalCount,
      }, { status: 429 })
    }

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
        search_session_id: search_session_id || null,
        custom_data: custom_data || {},
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
