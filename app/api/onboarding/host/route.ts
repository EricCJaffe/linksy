import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/utils/email'

/**
 * POST /api/onboarding/host
 * Public endpoint — no auth required.
 * Accepts a host widget embedding request and notifies the site admin.
 */
export async function POST(request: Request) {
  const body = await request.json()
  const {
    org_name,
    website,
    contact_name,
    contact_email,
    contact_phone,
    use_case,
    expected_monthly_users,
  } = body

  if (!org_name || !contact_name || !contact_email || !website) {
    return NextResponse.json(
      { error: 'Organization name, website, contact name, and email are required.' },
      { status: 400 }
    )
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || ''

  const html = `
    <h2>New Host Widget Request</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Organization</td><td style="padding:6px 12px">${org_name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Website</td><td style="padding:6px 12px"><a href="${website}">${website}</a></td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Name</td><td style="padding:6px 12px">${contact_name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Email</td><td style="padding:6px 12px"><a href="mailto:${contact_email}">${contact_email}</a></td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Phone</td><td style="padding:6px 12px">${contact_phone || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Use Case</td><td style="padding:6px 12px">${use_case || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Expected Monthly Users</td><td style="padding:6px 12px">${expected_monthly_users || '—'}</td></tr>
    </table>
    <p style="margin-top:16px;color:#6b7280;font-size:13px">Submitted via the Linksy host onboarding form.</p>
  `

  if (adminEmail) {
    void sendEmail({
      to: adminEmail,
      subject: `New Host Widget Request: ${org_name}`,
      html,
      text: `New host widget request from ${org_name} (${contact_email}). Website: ${website}`,
    })
  }

  return NextResponse.json({ success: true })
}
