import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { sendWebhookEvent } from '@/lib/utils/webhooks'
import { checkDuplicateReferral } from '@/lib/utils/duplicate-detection'

/** Auto-detect test referrals by client name */
function isTestReferral(clientName?: string | null): boolean {
  if (!clientName) return false
  return clientName.trim().toLowerCase() === 'mega coolmint'
}

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
    const SITE_ID = process.env.LINKSY_SITE_ID || '86bd8d01-0dc5-4479-beff-666712654104'

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

    // Check if provider is frozen
    if (!isTestReferral(client_name)) {
      const { data: providerCheck } = await supabase
        .from('linksy_providers')
        .select('is_frozen')
        .eq('id', provider_id)
        .single()
      if (providerCheck?.is_frozen) {
        return NextResponse.json(
          { error: 'This provider is currently not accepting referrals.' },
          { status: 400 }
        )
      }
    }

    // Referral cap: max 4 active referrals per client (identified by email or phone)
    // Only count tickets that are still active (not closed/resolved)
    const MAX_REFERRALS_PER_CLIENT = 4
    let capQuery = supabase
      .from('linksy_tickets')
      .select('id, ticket_number, provider_id, created_at', { count: 'exact', head: false })
      .in('status', ['pending', 'in_process', 'transferred_pending'])  // Count active tickets

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

    // Duplicate referral detection (TASK-029)
    // Test referrals bypass duplicate detection
    let duplicateFlagType: string | null = null
    if (!isTestReferral(client_name)) {
      const dupCheck = await checkDuplicateReferral(supabase, {
        client_email,
        client_phone,
        provider_id,
        need_id,
      })

      if (dupCheck.blocked) {
        return NextResponse.json({
          error: 'Duplicate referral detected',
          message: dupCheck.message,
          flagType: dupCheck.flagType,
          relatedTickets: dupCheck.relatedTickets,
        }, { status: 409 })
      }
      // Case A and C are flagged but allowed — store flag on the ticket
      duplicateFlagType = dupCheck.flagType
    }

    // Generate ticket number atomically via PostgreSQL sequence (prevents race conditions)
    const { data: seqResult, error: seqError } = await supabase.rpc(
      'linksy_next_ticket_number' as any
    )

    let ticketNumber: string
    if (seqError || seqResult == null) {
      // Fallback if sequence RPC not yet deployed
      console.warn('Ticket sequence unavailable, using timestamp fallback:', seqError?.message)
      const fallbackSeq = Date.now() % 1000000
      const suffix = String(Math.floor(Math.random() * 100)).padStart(2, '0')
      ticketNumber = `R-${fallbackSeq}-${suffix}`
    } else {
      ticketNumber = seqResult as string
    }

    // Create the ticket
    const { data: ticket, error: insertError } = await supabase
      .from('linksy_tickets')
      .insert({
        site_id: SITE_ID,
        provider_id,
        need_id: need_id || null,
        ticket_number: ticketNumber,
        client_name: client_name || null,
        client_phone: client_phone || null,
        client_email: client_email || null,
        description_of_need: description_of_need || null,
        is_test: isTestReferral(client_name),
        duplicate_flag_type: duplicateFlagType,
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

    console.log('[webhook] enqueue ticket.created', { ticket_number: ticket.ticket_number })
    const webhookProviderId = host_provider_id || provider_id
    let webhookTenantId: string | null = null
    if (webhookProviderId) {
      const { data: webhookProvider } = await supabase
        .from('linksy_providers')
        .select('tenant_id')
        .eq('id', webhookProviderId)
        .single()
      webhookTenantId = webhookProvider?.tenant_id || null
    }

    if (webhookTenantId) {
      console.log('[webhook] enqueue ticket.created', {
        ticket_number: ticket.ticket_number,
        tenant_id: webhookTenantId,
      })
      void sendWebhookEvent({
        tenantId: webhookTenantId,
        eventType: 'ticket.created',
        payload: {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          status: 'pending',
          source: 'public_search',
          provider_id,
          need_id: need_id || null,
          client_name: client_name || null,
          created_at: new Date().toISOString(),
        },
      }).catch((err) => {
        console.error('[webhook] failed to send ticket.created event:', err)
      })
    } else {
      console.warn('[webhook] skipped ticket.created - missing tenant_id', {
        provider_id: webhookProviderId,
      })
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
