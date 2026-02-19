import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'
import { createBulkNotifications } from '@/lib/utils/notifications'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/onboarding/provider
 * Public endpoint — no auth required.
 * Persists a provider application and notifies site admins.
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
    phone,
    hours,
    address,
    city,
    state,
    postal_code,
  } = body

  if (!org_name || !contact_name || !contact_email) {
    return NextResponse.json(
      { error: 'Organization name, contact name, and email are required.' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Insert application
  const { data: application, error: insertError } = await supabase
    .from('linksy_provider_applications')
    .insert({
      org_name,
      sector: sector || null,
      description: description || null,
      services: services || null,
      website: website || null,
      phone: phone || null,
      hours: hours || null,
      address: address || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    logger.dbError('Insert provider application', insertError as Error)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }

  // Notify all site_admin users
  try {
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'site_admin')

    if (admins && admins.length > 0) {
      await createBulkNotifications(
        admins.map((admin) => ({
          user_id: admin.id,
          type: 'info' as const,
          title: 'New Provider Application',
          message: `${org_name} has submitted a provider application.`,
          action_url: '/dashboard/admin/provider-applications',
        }))
      )
    }
  } catch (err) {
    // Non-blocking — don't fail the request if notifications fail
    logger.dbError('Notify admins of provider application', err as Error)
  }

  // Send admin email notification
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || ''
  const locationParts = [address, city, state, postal_code].filter(Boolean).join(', ')

  const html = `
    <h2>New Provider Listing Request</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Organization</td><td style="padding:6px 12px">${org_name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Sector</td><td style="padding:6px 12px">${sector || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Description</td><td style="padding:6px 12px">${description || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Services Offered</td><td style="padding:6px 12px">${services || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Phone</td><td style="padding:6px 12px">${phone || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Hours</td><td style="padding:6px 12px">${hours || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Name</td><td style="padding:6px 12px">${contact_name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Email</td><td style="padding:6px 12px"><a href="mailto:${contact_email}">${contact_email}</a></td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Contact Phone</td><td style="padding:6px 12px">${contact_phone || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Website</td><td style="padding:6px 12px">${website || '—'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6">Location</td><td style="padding:6px 12px">${locationParts || '—'}</td></tr>
    </table>
    <p style="margin-top:16px;color:#6b7280;font-size:13px">Submitted via the Linksy provider onboarding form. <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/admin/provider-applications">Review in dashboard</a></p>
  `

  if (adminEmail) {
    void sendEmail({
      to: adminEmail,
      subject: `New Provider Listing Request: ${org_name}`,
      html,
      text: `New provider listing request from ${org_name} (${contact_email}).`,
    })
  }

  return NextResponse.json({ success: true, applicationId: application.id })
}
