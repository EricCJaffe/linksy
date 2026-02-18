import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/utils/email'

/**
 * POST /api/onboarding/provider
 * Public endpoint — no auth required.
 * Accepts a provider listing request and notifies the site admin.
 */
export async function POST(request: Request) {
  const body = await request.json()
  const {
    org_name,
    sector,
    description,
    services,
    contact_name,
    contact_email,
    contact_phone,
    website,
    address,
    city,
    state,
  } = body

  if (!org_name || !contact_name || !contact_email) {
    return NextResponse.json(
      { error: 'Organization name, contact name, and email are required.' },
      { status: 400 }
    )
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || ''

  const html = `
    <h2>New Provider Listing Request</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Organization</td><td style="padding:6px 12px">${org_name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Sector</td><td style="padding:6px 12px">${sector || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Description</td><td style="padding:6px 12px">${description || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Services Offered</td><td style="padding:6px 12px">${services || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Name</td><td style="padding:6px 12px">${contact_name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Email</td><td style="padding:6px 12px"><a href="mailto:${contact_email}">${contact_email}</a></td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Phone</td><td style="padding:6px 12px">${contact_phone || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Website</td><td style="padding:6px 12px">${website || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Location</td><td style="padding:6px 12px">${[address, city, state].filter(Boolean).join(', ') || '—'}</td></tr>
    </table>
    <p style="margin-top:16px;color:#6b7280;font-size:13px">Submitted via the Linksy provider onboarding form.</p>
  `

  if (adminEmail) {
    void sendEmail({
      to: adminEmail,
      subject: `New Provider Listing Request: ${org_name}`,
      html,
      text: `New provider listing request from ${org_name} (${contact_email}).`,
    })
  }

  return NextResponse.json({ success: true })
}
