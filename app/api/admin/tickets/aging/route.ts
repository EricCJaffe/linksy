import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { sendEmail } from '@/lib/utils/email'

/**
 * GET /api/admin/tickets/aging
 * Find aging pending tickets and return stats
 *
 * Query params:
 * - threshold_hours: Number of hours before ticket is considered aging (default: 48)
 * - send_notifications: If true, send email alerts to admins (default: false)
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const thresholdHours = parseInt(searchParams.get('threshold_hours') || '48')
  const sendNotifications = searchParams.get('send_notifications') === 'true'

  const supabase = await createServiceClient()

  // Calculate cutoff time (now - threshold hours)
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - thresholdHours)

  // Fetch pending tickets older than threshold
  const { data: agingTickets, error: fetchError } = await supabase
    .from('linksy_tickets')
    .select(`
      id,
      ticket_number,
      client_name,
      client_email,
      client_phone,
      description_of_need,
      created_at,
      provider_id,
      need_id,
      linksy_providers!left(name, email),
      linksy_needs!left(name)
    `)
    .eq('status', 'pending')
    .lt('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: true })

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Calculate aging stats
  const now = new Date()
  const ticketsWithAge = (agingTickets || []).map((ticket) => {
    const createdAt = new Date(ticket.created_at)
    const ageHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
    const ageDays = Math.floor(ageHours / 24)

    return {
      ...ticket,
      ageHours,
      ageDays,
      provider: (ticket as any).linksy_providers
        ? { name: (ticket as any).linksy_providers.name, email: (ticket as any).linksy_providers.email }
        : null,
      need: (ticket as any).linksy_needs
        ? { name: (ticket as any).linksy_needs.name }
        : null,
    }
  })

  // Group by age buckets
  const buckets = {
    '2-3 days': ticketsWithAge.filter(t => t.ageDays >= 2 && t.ageDays < 3).length,
    '3-7 days': ticketsWithAge.filter(t => t.ageDays >= 3 && t.ageDays < 7).length,
    '1-2 weeks': ticketsWithAge.filter(t => t.ageDays >= 7 && t.ageDays < 14).length,
    '2+ weeks': ticketsWithAge.filter(t => t.ageDays >= 14).length,
  }

  // Send notifications if requested
  let notificationSent = false
  if (sendNotifications && ticketsWithAge.length > 0) {
    try {
      // Fetch site admin emails
      const { data: admins } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('role', 'site_admin')

      if (admins && admins.length > 0) {
        // Build email content
        const emailContent = `
<h2>Aging Referral Alert</h2>

<p>You have ${ticketsWithAge.length} pending referral ticket${ticketsWithAge.length !== 1 ? 's' : ''} that ${ticketsWithAge.length !== 1 ? 'have' : 'has'} been open for more than ${thresholdHours} hours.</p>

<h3>Age Breakdown:</h3>
<ul>
  <li><strong>2-3 days:</strong> ${buckets['2-3 days']} ticket${buckets['2-3 days'] !== 1 ? 's' : ''}</li>
  <li><strong>3-7 days:</strong> ${buckets['3-7 days']} ticket${buckets['3-7 days'] !== 1 ? 's' : ''}</li>
  <li><strong>1-2 weeks:</strong> ${buckets['1-2 weeks']} ticket${buckets['1-2 weeks'] !== 1 ? 's' : ''}</li>
  <li><strong>2+ weeks:</strong> ${buckets['2+ weeks']} ticket${buckets['2+ weeks'] !== 1 ? 's' : ''}</li>
</ul>

<h3>Oldest Pending Referrals (Top 10):</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th>Ticket #</th>
      <th>Client</th>
      <th>Provider</th>
      <th>Age</th>
    </tr>
  </thead>
  <tbody>
    ${ticketsWithAge.slice(0, 10).map(ticket => `
      <tr>
        <td>${ticket.ticket_number || ticket.id.substring(0, 8)}</td>
        <td>${ticket.client_name || 'Unknown'}</td>
        <td>${ticket.provider?.name || 'Unassigned'}</td>
        <td>${ticket.ageDays} day${ticket.ageDays !== 1 ? 's' : ''}</td>
      </tr>
    `).join('')}
  </tbody>
</table>

<p style="margin-top: 20px;">
  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tickets?status=pending" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Pending Referrals</a>
</p>
`

        // Send to all site admins
        for (const admin of admins) {
          await sendEmail({
            to: admin.email,
            subject: `⚠️ Aging Referral Alert: ${ticketsWithAge.length} Pending Ticket${ticketsWithAge.length !== 1 ? 's' : ''}`,
            text: `You have ${ticketsWithAge.length} pending referral tickets that have been open for more than ${thresholdHours} hours. Please review them in the dashboard.`,
            html: emailContent,
          })
        }

        notificationSent = true
      }
    } catch (emailError) {
      console.error('[aging notifications] Failed to send emails:', emailError)
    }
  }

  return NextResponse.json({
    total: ticketsWithAge.length,
    thresholdHours,
    buckets,
    notificationSent,
    tickets: ticketsWithAge.map(t => ({
      id: t.id,
      ticket_number: t.ticket_number,
      client_name: t.client_name,
      provider_name: t.provider?.name,
      need_name: t.need?.name,
      ageHours: t.ageHours,
      ageDays: t.ageDays,
      created_at: t.created_at,
    })),
  })
}
