import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/cron/sla-reminders
 *
 * Daily cron job that sends per-provider SLA reminder emails.
 * For each pending ticket that has exceeded the provider's sla_reminder_hours
 * and hasn't already received a reminder, sends an email to the provider's
 * default referral handler contact.
 *
 * Controlled by a master switch in linksy_referral_alert_config.sla_reminder_enabled.
 * Each provider can configure their own sla_reminder_hours (default 48).
 *
 * Protected by CRON_SECRET header (Vercel cron authentication).
 */
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const SITE_ID = process.env.LINKSY_SITE_ID || '86bd8d01-0dc5-4479-beff-666712654104'

  // Check master switch
  const { data: config } = await supabase
    .from('linksy_referral_alert_config')
    .select('sla_reminder_enabled')
    .eq('site_id', SITE_ID)
    .maybeSingle()

  const isEnabled = config?.sla_reminder_enabled ?? false

  if (!isEnabled) {
    return NextResponse.json({ skipped: true, reason: 'SLA reminders disabled (master switch off)' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const now = new Date()

  // Find all pending tickets that:
  // 1. Haven't had a reminder sent yet
  // 2. Have exceeded the provider's sla_reminder_hours threshold
  const { data: eligibleTickets, error: fetchError } = await supabase
    .from('linksy_tickets')
    .select(`
      id,
      ticket_number,
      client_name,
      created_at,
      provider_id,
      need_id,
      sla_due_at,
      linksy_providers!provider_id(
        id,
        name,
        sla_hours,
        sla_reminder_hours
      ),
      linksy_needs!need_id(name)
    `)
    .eq('status', 'pending')
    .is('sla_reminder_sent_at', null)
    .not('provider_id', 'is', null)

  if (fetchError) {
    logger.error('[sla-reminders] Failed to query tickets', undefined, { error: fetchError.message })
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!eligibleTickets || eligibleTickets.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no eligible tickets' })
  }

  // Filter tickets that have exceeded their provider's sla_reminder_hours
  const ticketsToRemind = eligibleTickets.filter((ticket) => {
    const provider = (ticket as any).linksy_providers
    if (!provider) return false
    const reminderHours = provider.sla_reminder_hours ?? 48
    const createdAt = new Date(ticket.created_at)
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    return hoursSinceCreated >= reminderHours
  })

  if (ticketsToRemind.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no tickets past reminder threshold' })
  }

  // Group tickets by provider to batch lookups for contacts
  const ticketsByProvider = new Map<string, typeof ticketsToRemind>()
  for (const ticket of ticketsToRemind) {
    const providerId = ticket.provider_id!
    const existing = ticketsByProvider.get(providerId) || []
    existing.push(ticket)
    ticketsByProvider.set(providerId, existing)
  }

  // Fetch default referral handler contacts for all relevant providers
  const providerIds = Array.from(ticketsByProvider.keys())
  const { data: contacts } = await supabase
    .from('linksy_provider_contacts')
    .select('provider_id, user_id, users!inner(email, full_name)')
    .in('provider_id', providerIds)
    .eq('is_default_referral_handler', true)
    .eq('status', 'active')

  // Build a map of provider_id -> contact email/name
  const contactMap = new Map<string, { email: string; name: string }>()
  if (contacts) {
    for (const c of contacts) {
      const user = (c as any).users
      if (user?.email) {
        contactMap.set(c.provider_id, {
          email: user.email,
          name: user.full_name || user.email,
        })
      }
    }
  }

  let sentCount = 0
  const sentTicketIds: string[] = []

  for (const [providerId, tickets] of Array.from(ticketsByProvider.entries())) {
    const contact = contactMap.get(providerId)
    if (!contact) {
      logger.warn('[sla-reminders] No default referral handler for provider', { providerId })
      continue
    }

    // Send one email per ticket
    for (const ticket of tickets) {
      const provider = (ticket as any).linksy_providers
      const needName = (ticket as any).linksy_needs?.name || 'N/A'
      const createdAt = new Date(ticket.created_at)
      const hoursPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
      const daysPending = Math.floor(hoursPending / 24)
      const ticketUrl = `${appUrl}/dashboard/providers/${providerId}?tab=tickets`

      const subject = `SLA Reminder: Referral ${ticket.ticket_number || ticket.id.substring(0, 8)} pending for ${daysPending} day${daysPending !== 1 ? 's' : ''}`

      const html = `
<h2>SLA Reminder</h2>

<p>Hi ${contact.name},</p>

<p>This is a reminder that referral <strong>${ticket.ticket_number || ticket.id.substring(0, 8)}</strong> has been pending for <strong>${daysPending} day${daysPending !== 1 ? 's' : ''} (${hoursPending} hours)</strong>, which exceeds your organization's SLA reminder threshold of ${provider?.sla_reminder_hours ?? 48} hours.</p>

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">
  <tr>
    <td style="font-weight: bold; background-color: #f3f4f6;">Ticket #</td>
    <td>${ticket.ticket_number || ticket.id.substring(0, 8)}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background-color: #f3f4f6;">Client</td>
    <td>${ticket.client_name || 'Unknown'}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background-color: #f3f4f6;">Service</td>
    <td>${needName}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background-color: #f3f4f6;">Provider</td>
    <td>${provider?.name || 'Unknown'}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; background-color: #f3f4f6;">SLA Deadline</td>
    <td>${ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'Not set'}</td>
  </tr>
</table>

<p>Please review and update this referral at your earliest convenience.</p>

<p style="margin-top: 24px;">
  <a href="${ticketUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
    View Referral
  </a>
</p>

<p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
  This is an automated SLA reminder from ${appName}. Your organization's SLA is set to ${provider?.sla_hours ?? 24} hours with reminders at ${provider?.sla_reminder_hours ?? 48} hours.
  To adjust these settings, contact your administrator.
</p>
`
      const text = `SLA Reminder: Referral ${ticket.ticket_number || ticket.id.substring(0, 8)} for ${ticket.client_name || 'Unknown'} has been pending for ${daysPending} days. Please review at ${ticketUrl}`

      try {
        await sendEmail({ to: contact.email, subject, html, text })
        sentCount++
        sentTicketIds.push(ticket.id)
      } catch (err) {
        logger.error('[sla-reminders] Failed to send email', err instanceof Error ? err : undefined, {
          to: contact.email,
          ticketId: ticket.id,
        })
      }
    }
  }

  // Mark tickets as having had their reminder sent
  if (sentTicketIds.length > 0) {
    const { error: updateError } = await supabase
      .from('linksy_tickets')
      .update({ sla_reminder_sent_at: now.toISOString() })
      .in('id', sentTicketIds)

    if (updateError) {
      logger.error('[sla-reminders] Failed to update sla_reminder_sent_at', undefined, {
        error: updateError.message,
      })
    }
  }

  logger.info('[sla-reminders] Complete', {
    eligibleCount: ticketsToRemind.length,
    sentCount,
    providersChecked: providerIds.length,
  })

  return NextResponse.json({
    sent: sentCount,
    eligible: ticketsToRemind.length,
    providersChecked: providerIds.length,
  })
}
