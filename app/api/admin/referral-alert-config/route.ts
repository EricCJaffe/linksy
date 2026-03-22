import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/referral-alert-config
 * Returns the current stale referral alert configuration.
 */
export async function GET() {
  const { error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()
  const SITE_ID = process.env.LINKSY_SITE_ID || '86bd8d01-0dc5-4479-beff-666712654104'

  const { data: config } = await supabase
    .from('linksy_referral_alert_config')
    .select('*')
    .eq('site_id', SITE_ID)
    .maybeSingle()

  // Return defaults if no config row exists yet
  return NextResponse.json(config || {
    is_enabled: true,
    threshold_hours: 48,
    notify_emails: [],
    notify_site_admins: true,
    sla_reminder_enabled: false,
  })
}

/**
 * PUT /api/admin/referral-alert-config
 * Upserts the stale referral alert configuration.
 */
export async function PUT(request: Request) {
  const { error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const supabase = await createServiceClient()
  const SITE_ID = process.env.LINKSY_SITE_ID || '86bd8d01-0dc5-4479-beff-666712654104'

  const thresholdHours = Math.max(1, Math.min(720, parseInt(body.threshold_hours) || 48))

  // Validate emails
  const notifyEmails: string[] = Array.isArray(body.notify_emails)
    ? body.notify_emails.filter((e: unknown) => typeof e === 'string' && e.includes('@'))
    : []

  const { data: config, error: upsertError } = await supabase
    .from('linksy_referral_alert_config')
    .upsert(
      {
        site_id: SITE_ID,
        is_enabled: body.is_enabled !== false,
        threshold_hours: thresholdHours,
        notify_emails: notifyEmails,
        notify_site_admins: body.notify_site_admins !== false,
        sla_reminder_enabled: body.sla_reminder_enabled === true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id' }
    )
    .select()
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json(config)
}
