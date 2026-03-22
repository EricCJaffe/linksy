import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/cron/stale-referral-alerts
 *
 * Daily cron job that checks for pending referrals older than the configured
 * threshold and emails designated recipients.
 *
 * Uses linksy_referral_alert_config for per-site settings:
 *   - threshold_hours (default 48)
 *   - notify_emails (explicit addresses)
 *   - notify_site_admins (also email all site admins)
 *
 * Protected by CRON_SECRET header (Vercel cron authentication).
 */
export const maxDuration = 30

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const SITE_ID = process.env.LINKSY_SITE_ID || '86bd8d01-0dc5-4479-beff-666712654104'

  // Load alert config
  const { data: config } = await supabase
    .from('linksy_referral_alert_config')
    .select('*')
    .eq('site_id', SITE_ID)
    .maybeSingle()

  // Use defaults if no config row exists
  const isEnabled = config?.is_enabled ?? true
  const thresholdHours = config?.threshold_hours ?? 48
  const notifyEmails: string[] = config?.notify_emails ?? []
  const notifySiteAdmins = config?.notify_site_admins ?? true

  if (!isEnabled) {
    return NextResponse.json({ skipped: true, reason: 'alerts disabled' })
  }

  // Find pending tickets older than threshold
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - thresholdHours)

  const { data: agingTickets, error: fetchError } = await supabase
    .from('linksy_tickets')
    .select(`
      id,
      ticket_number,
      client_name,
      created_at,
      provider_id,
      need_id,
      linksy_providers!provider_id(name),
      linksy_needs!need_id(name)
    `)
    .eq('status', 'pending')
    .lt('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: true })

  if (fetchError) {
    logger.error('[stale-referral-alerts] Failed to query tickets', undefined, { error: fetchError.message })
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!agingTickets || agingTickets.length === 0) {
    return NextResponse.json({ sent: false, reason: 'no stale referrals', thresholdHours })
  }

  // Calculate age for each ticket
  const now = new Date()
  const ticketsWithAge = agingTickets.map((ticket) => {
    const createdAt = new Date(ticket.created_at)
    const ageHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
    const ageDays = Math.floor(ageHours / 24)
    return {
      ticket_number: ticket.ticket_number || ticket.id.substring(0, 8),
      client_name: ticket.client_name || 'Unknown',
      provider_name: (ticket as any).linksy_providers?.name || 'Unassigned',
      need_name: (ticket as any).linksy_needs?.name || '-',
      ageHours,
      ageDays,
    }
  })

  // Group by age buckets
  const buckets = {
    '2-3 days': ticketsWithAge.filter(t => t.ageDays >= 2 && t.ageDays < 3).length,
    '3-7 days': ticketsWithAge.filter(t => t.ageDays >= 3 && t.ageDays < 7).length,
    '1-2 weeks': ticketsWithAge.filter(t => t.ageDays >= 7 && t.ageDays < 14).length,
    '2+ weeks': ticketsWithAge.filter(t => t.ageDays >= 14).length,
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'

  // Build email HTML
  const emailHtml = `
<h2>Stale Referral Alert</h2>

<p>You have <strong>${ticketsWithAge.length}</strong> pending referral${ticketsWithAge.length !== 1 ? 's' : ''} that ${ticketsWithAge.length !== 1 ? 'have' : 'has'} been open for more than <strong>${thresholdHours} hours (${Math.round(thresholdHours / 24)} day${thresholdHours >= 48 ? 's' : ''})</strong>.</p>

<h3>Age Breakdown</h3>
<ul>
  ${Object.entries(buckets).filter(([, count]) => count > 0).map(([label, count]) =>
    `<li><strong>${label}:</strong> ${count} referral${count !== 1 ? 's' : ''}</li>`
  ).join('\n  ')}
</ul>

<h3>Pending Referrals (Top 15)</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 14px;">
  <thead style="background-color: #f3f4f6;">
    <tr>
      <th style="text-align: left;">Ticket #</th>
      <th style="text-align: left;">Client</th>
      <th style="text-align: left;">Provider</th>
      <th style="text-align: left;">Service</th>
      <th style="text-align: right;">Age</th>
    </tr>
  </thead>
  <tbody>
    ${ticketsWithAge.slice(0, 15).map(t => `
    <tr>
      <td>${t.ticket_number}</td>
      <td>${t.client_name}</td>
      <td>${t.provider_name}</td>
      <td>${t.need_name}</td>
      <td style="text-align: right;">${t.ageDays} day${t.ageDays !== 1 ? 's' : ''}</td>
    </tr>`).join('')}
  </tbody>
</table>
${ticketsWithAge.length > 15 ? `<p style="color: #6b7280; font-size: 13px;">...and ${ticketsWithAge.length - 15} more</p>` : ''}

<p style="margin-top: 24px;">
  <a href="${appUrl}/dashboard/tickets?status=pending" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
    Review Pending Referrals
  </a>
</p>

<p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
  This is an automated alert from ${appName}. To adjust the threshold or disable these alerts, visit
  <a href="${appUrl}/dashboard/admin/email-templates">Admin &gt; Email &amp; Alerts</a>.
</p>
`

  const subject = `Stale Referral Alert: ${ticketsWithAge.length} pending referral${ticketsWithAge.length !== 1 ? 's' : ''} over ${Math.round(thresholdHours / 24)} day${thresholdHours >= 48 ? 's' : ''}`
  const textFallback = `You have ${ticketsWithAge.length} pending referrals that have been open for more than ${thresholdHours} hours. Review them at ${appUrl}/dashboard/tickets?status=pending`

  // Collect recipient list
  const recipients: string[] = [...notifyEmails]

  if (notifySiteAdmins) {
    const { data: admins } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'site_admin')

    if (admins) {
      for (const admin of admins) {
        if (admin.email && !recipients.includes(admin.email)) {
          recipients.push(admin.email)
        }
      }
    }
  }

  if (recipients.length === 0) {
    logger.warn('[stale-referral-alerts] No recipients configured')
    return NextResponse.json({ sent: false, reason: 'no recipients', total: ticketsWithAge.length })
  }

  // Send emails
  let sentCount = 0
  for (const email of recipients) {
    try {
      await sendEmail({ to: email, subject, html: emailHtml, text: textFallback })
      sentCount++
    } catch (err) {
      logger.error(
        '[stale-referral-alerts] Failed to send email',
        err instanceof Error ? err : undefined,
        { to: email }
      )
    }
  }

  logger.info('[stale-referral-alerts] Complete', {
    staleCount: ticketsWithAge.length,
    recipientCount: recipients.length,
    sentCount,
    thresholdHours,
  })

  return NextResponse.json({
    sent: true,
    total: ticketsWithAge.length,
    thresholdHours,
    recipientCount: recipients.length,
    sentCount,
    buckets,
  })
}
