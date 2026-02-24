/**
 * Email service utility for sending transactional emails
 *
 * Supports two email providers:
 * 1. Resend (recommended) - Set RESEND_API_KEY
 * 2. SMTP (fallback) - Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *
 * If neither is configured, emails will be logged to console in development.
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { EmailTemplateKey } from '@/lib/email/template-registry'
import { logger } from './logger'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface InvitationEmailData {
  email: string
  inviterName: string
  tenantName: string
  role: 'admin' | 'member'
  inviteUrl: string
}

interface EmailTemplateOverride {
  subject_template: string
  html_template: string
  text_template: string | null
  is_active: boolean
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? '')
}

async function getHostEmailTemplateOverride(
  templateKey: EmailTemplateKey,
  hostId?: string
): Promise<{ subject: string; body_html: string } | null> {
  if (!hostId) return null

  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('linksy_host_email_templates')
      .select('subject, body_html')
      .eq('host_id', hostId)
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      logger.warn('Failed to load host email template override; checking system template.', {
        hostId,
        templateKey,
        error: error.message,
      })
      return null
    }

    return data || null
  } catch (error) {
    logger.warn('Failed to load host email template override; checking system template.', {
      hostId,
      templateKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

async function getEmailTemplateOverride(
  templateKey: EmailTemplateKey
): Promise<EmailTemplateOverride | null> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('linksy_email_templates')
      .select('subject_template, html_template, text_template, is_active')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      logger.warn('Failed to load email template override; using default template.', {
        templateKey,
        error: error.message,
      })
      return null
    }

    return data || null
  } catch (error) {
    logger.warn('Failed to load email template override; using default template.', {
      templateKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

async function resolveEmailTemplate({
  templateKey,
  defaultSubject,
  defaultHtml,
  defaultText,
  variables,
  hostId,
}: {
  templateKey: EmailTemplateKey
  defaultSubject: string
  defaultHtml: string
  defaultText?: string
  variables: Record<string, string>
  hostId?: string
}): Promise<{ subject: string; html: string; text?: string }> {
  // Check host-specific template first (if hostId provided)
  const hostOverride = await getHostEmailTemplateOverride(templateKey, hostId)
  if (hostOverride) {
    const subject = renderTemplate(hostOverride.subject, variables)
    const html = renderTemplate(hostOverride.body_html, variables)
    // Host templates don't have separate text version, derive from HTML
    return { subject, html }
  }

  // Fall back to system template override
  const override = await getEmailTemplateOverride(templateKey)
  const subjectTemplate = override?.subject_template || defaultSubject
  const htmlTemplate = override?.html_template || defaultHtml
  const textTemplate = override?.text_template ?? defaultText

  const subject = renderTemplate(subjectTemplate, variables)
  const html = renderTemplate(htmlTemplate, variables)
  const text = textTemplate ? renderTemplate(textTemplate, variables) : undefined

  return { subject, html, text }
}

/**
 * Send an email using the configured email service
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@example.com'
  const fromName = process.env.SMTP_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY

  // Check if SMTP is configured
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  )

  // Development mode without email service configured
  if (isDevelopment && !resendApiKey && !smtpConfigured) {
    logger.warn('No email service configured. Email would be sent in production.', {
      to: options.to,
      subject: options.subject,
      preview: options.html.substring(0, 200),
    })
    console.log('\n📧 EMAIL (Development Mode - Not Sent)\n')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('HTML Preview:', options.html.substring(0, 500))
    console.log('\n')
    return { success: true }
  }

  // Try Resend first (recommended)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('Resend API error', new Error(error), {
          status: response.status,
          to: options.to,
          subject: options.subject,
        })
        return { success: false, error: 'Failed to send email' }
      }

      logger.info('Email sent successfully via Resend', {
        to: options.to,
        subject: options.subject,
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to send email via Resend', error instanceof Error ? error : new Error('Unknown error'), {
        to: options.to,
        subject: options.subject,
      })
      return { success: false, error: 'Failed to send email' }
    }
  }

  // Fallback to SMTP
  if (smtpConfigured) {
    try {
      // Dynamically import nodemailer only when SMTP is used
      const nodemailer = await import('nodemailer')

      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      })

      await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      logger.info('Email sent successfully via SMTP', {
        to: options.to,
        subject: options.subject,
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to send email via SMTP', error instanceof Error ? error : new Error('Unknown error'), {
        to: options.to,
        subject: options.subject,
      })
      return { success: false, error: 'Failed to send email' }
    }
  }

  // No email service configured in production
  logger.error('No email service configured', new Error('Email service not configured'), {
    to: options.to,
    subject: options.subject,
    isDevelopment,
    hasResend: !!resendApiKey,
    hasSmtp: smtpConfigured,
  })

  return { success: false, error: 'Email service not configured' }
}

// --- Linksy ticket email templates ---

/**
 * Format custom field responses for email inclusion
 */
function formatCustomFields(customData?: Record<string, any>, fields?: Array<{ field_label: string; field_type: string }>): string {
  if (!customData || !fields || fields.length === 0) {
    return ''
  }

  const rows = fields
    .map((field) => {
      const value = customData[field.field_label]
      if (!value) return null

      let displayValue: string
      if (Array.isArray(value)) {
        displayValue = value.join(', ')
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No'
      } else {
        displayValue = String(value)
      }

      return `<tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;vertical-align:top">${field.field_label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${displayValue}</td></tr>`
    })
    .filter(Boolean)
    .join('')

  return rows ? `<tr><td colspan="2" style="padding:12px;background:#fef3c7;font-weight:600">Custom Fields</td></tr>${rows}` : ''
}

/**
 * Send a notification to the default referral handler when a new ticket is created
 */
export async function sendNewTicketNotification({
  to,
  contactName,
  ticketNumber,
  clientName,
  needName,
  description,
  providerName,
  ticketUrl,
  customData,
  customFields,
  hostId,
}: {
  to: string
  contactName: string
  ticketNumber: string
  clientName: string
  needName: string
  description: string
  providerName: string
  ticketUrl: string
  customData?: Record<string, any>
  customFields?: Array<{ field_label: string; field_type: string }>
  hostId?: string
}): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const safeClientName = clientName || 'Not provided'
  const safeNeedName = needName || 'Not specified'
  const safeDescription = description || 'None provided'
  const customFieldsHtml = formatCustomFields(customData, customFields)

  const defaultHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#2563eb;padding:24px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">${appName}</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 10px 10px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
    <h2 style="color:#111;margin-top:0">New Referral Ticket Assigned</h2>
    <p>Hi ${contactName},</p>
    <p>A new referral has been submitted to <strong>${providerName}</strong>.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px">Ticket #</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${ticketNumber}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Client</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${safeClientName}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Need</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${safeNeedName}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;vertical-align:top">Description</td><td style="padding:8px 12px">${safeDescription}</td></tr>
      ${customFieldsHtml}
    </table>
    <div style="text-align:center;margin:28px 0">
      <a href="${ticketUrl}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">View Ticket</a>
    </div>
    <p style="color:#6b7280;font-size:13px">You are receiving this because you are the default referral handler for ${providerName}.</p>
  </div>
</body>
</html>`.trim()

  const { subject, html, text } = await resolveEmailTemplate({
    templateKey: 'ticket_new_assignment',
    defaultSubject: `New referral ticket #${ticketNumber} - ${providerName}`,
    defaultHtml,
    variables: {
      app_name: appName,
      to,
      contact_name: contactName,
      ticket_number: ticketNumber,
      client_name: safeClientName,
      need_name: safeNeedName,
      description: safeDescription,
      provider_name: providerName,
      ticket_url: ticketUrl,
      custom_fields: customFieldsHtml,
    },
    hostId,
  })

  return sendEmail({
    to,
    subject,
    html,
    text,
  })
}

/**
 * Send a status update notification to the client when a ticket status changes
 */
export async function sendTicketStatusNotification({
  to,
  clientName,
  ticketNumber,
  newStatus,
  providerName,
  needName,
  hostId,
}: {
  to: string
  clientName: string
  ticketNumber: string
  newStatus: string
  providerName: string
  needName: string
  hostId?: string
}): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const safeClientName = clientName || 'there'
  const safeNeedName = needName || 'your requested service'

  const statusLabel: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  const label = statusLabel[newStatus] || newStatus

  const defaultHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#2563eb;padding:24px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">${appName}</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 10px 10px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
    <h2 style="color:#111;margin-top:0">Referral Status Update</h2>
    <p>Hi ${safeClientName},</p>
    <p>Your referral to <strong>${providerName}</strong> for <strong>${safeNeedName}</strong> has been updated.</p>
    <p style="font-size:20px;margin:24px 0">New status: <strong style="color:#2563eb">${label}</strong></p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px">Ticket #</td><td style="padding:8px 12px">${ticketNumber}</td></tr>
    </table>
    <p>If you have questions, please contact ${providerName} directly or reach out to the organization that submitted the referral on your behalf.</p>
    <p style="color:#6b7280;font-size:13px">You are receiving this because you were listed as the client for referral ticket #${ticketNumber}.</p>
  </div>
</body>
</html>`.trim()

  const { subject, html, text } = await resolveEmailTemplate({
    templateKey: 'ticket_status_update',
    defaultSubject: `Your referral status has been updated - ${label}`,
    defaultHtml,
    variables: {
      app_name: appName,
      to,
      client_name: safeClientName,
      ticket_number: ticketNumber,
      new_status: newStatus,
      status_label: label,
      provider_name: providerName,
      need_name: safeNeedName,
    },
    hostId,
  })

  return sendEmail({
    to,
    subject,
    html,
    text,
  })
}

/**
 * Send an invitation email to a new user
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const roleLabel = data.role === 'admin' ? 'an administrator' : 'a member'
  const roleBadge = data.role === 'admin' ? '👑 Administrator' : '👤 Team Member'

  const defaultHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to ${appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">You've been invited! 🎉</h2>

    <p style="font-size: 16px; color: #555;">
      <strong>${data.inviterName}</strong> has invited you to join <strong>${data.tenantName}</strong> on ${appName} as ${roleLabel}.
    </p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your role:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #667eea;">
        ${roleBadge}
      </p>
    </div>

    <p style="font-size: 16px; color: #555;">
      Click the button below to accept the invitation and create your account:
    </p>

    <div style="text-align: center; margin: 35px 0;">
      <a href="${data.inviteUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                display: inline-block;
                box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #888; margin-top: 30px;">
      Or copy and paste this URL into your browser:<br>
      <a href="${data.inviteUrl}" style="color: #667eea; word-break: break-all;">${data.inviteUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="font-size: 13px; color: #999; margin: 0;">
      This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    <p style="margin: 5px 0;">
      <a href="${appUrl}" style="color: #667eea; text-decoration: none;">Visit our website</a>
    </p>
  </div>
</body>
</html>
  `.trim()

  const defaultText = `
You've been invited to ${appName}!

${data.inviterName} has invited you to join ${data.tenantName} as ${roleLabel}.

Click the link below to accept the invitation and create your account:
${data.inviteUrl}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.

---
${appName}
${appUrl}
  `.trim()

  const { subject, html, text } = await resolveEmailTemplate({
    templateKey: 'invitation',
    defaultSubject: `You've been invited to join ${data.tenantName} on ${appName}`,
    defaultHtml,
    defaultText,
    variables: {
      app_name: appName,
      app_url: appUrl,
      email: data.email,
      inviter_name: data.inviterName,
      tenant_name: data.tenantName,
      role: data.role,
      invite_url: data.inviteUrl,
    },
  })

  return sendEmail({
    to: data.email,
    subject,
    html,
    text,
  })
}

/**
 * Send notification to site admins when a provider forwards a ticket to admin pool
 */
export async function sendTicketForwardedToAdminNotification({
  ticket,
  forwardedBy,
  reason,
  notes,
}: {
  ticket: any
  forwardedBy: { full_name: string | null; email: string }
  reason: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const ticketUrl = `${appUrl}/dashboard/tickets/${ticket.id}`
  const forwarderName = forwardedBy.full_name || forwardedBy.email

  const reasonLabels: Record<string, string> = {
    unable_to_assist: 'Unable to assist',
    wrong_org: 'Wrong organization',
    capacity: 'At capacity',
    other: 'Other',
  }
  const reasonLabel = reasonLabels[reason] || reason

  // Get all site admin emails
  const supabase = await createServiceClient()
  const { data: admins } = await supabase
    .from('users')
    .select('email')
    .eq('is_site_admin', true)

  if (!admins || admins.length === 0) {
    logger.warn('No site admins found to notify about forwarded ticket')
    return { success: false, error: 'No site admins to notify' }
  }

  const defaultHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#dc2626;padding:24px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">${appName}</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 10px 10px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
    <h2 style="color:#111;margin-top:0">⚠️ Ticket Forwarded to Admin Pool</h2>
    <p>A provider has forwarded ticket <strong>#${ticket.ticket_number}</strong> to the admin pool for reassignment.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px">Ticket #</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${ticket.ticket_number}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Forwarded by</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${forwarderName}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Reason</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${reasonLabel}</td></tr>
      ${notes ? `<tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;vertical-align:top">Notes</td><td style="padding:8px 12px">${notes}</td></tr>` : ''}
    </table>
    <div style="text-align:center;margin:28px 0">
      <a href="${ticketUrl}" style="background:#dc2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Reassign Ticket</a>
    </div>
    <p style="color:#6b7280;font-size:13px">This ticket requires admin attention for reassignment to an appropriate provider.</p>
  </div>
</body>
</html>`.trim()

  const { subject, html, text } = await resolveEmailTemplate({
    templateKey: 'ticket_forwarded_to_admin',
    defaultSubject: `Ticket #${ticket.ticket_number} forwarded for reassignment`,
    defaultHtml,
    variables: {
      app_name: appName,
      ticket_number: ticket.ticket_number,
      ticket_url: ticketUrl,
      forwarder_name: forwarderName,
      reason: reasonLabel,
      notes: notes || '',
    },
  })

  // Send to all site admins
  const results = await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject,
        html,
        text,
      })
    )
  )

  const allSuccess = results.every((r) => r.success)
  return { success: allSuccess }
}

/**
 * Send notification to assignee when a ticket is reassigned (provider-to-provider or admin reassignment)
 */
export async function sendTicketReassignedNotification({
  ticket,
  assignee_user_id,
  reassignedBy,
  reason,
  notes,
}: {
  ticket: any
  assignee_user_id: string
  reassignedBy: { full_name: string | null; email: string }
  reason: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const ticketUrl = `${appUrl}/dashboard/tickets/${ticket.id}`
  const reassignerName = reassignedBy.full_name || reassignedBy.email

  // Get assignee email and name
  const supabase = await createServiceClient()
  const { data: assignee } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', assignee_user_id)
    .single()

  if (!assignee) {
    logger.warn('Assignee not found for ticket reassignment notification', { assignee_user_id })
    return { success: false, error: 'Assignee not found' }
  }

  const assigneeName = assignee.full_name || 'there'
  const providerName = ticket.provider?.name || 'Unknown provider'

  const reasonLabels: Record<string, string> = {
    unable_to_assist: 'Previous provider unable to assist',
    wrong_org: 'Wrong organization',
    capacity: 'Previous provider at capacity',
    other: 'Other',
    admin_reassignment: 'Admin reassignment',
  }
  const reasonLabel = reasonLabels[reason] || reason

  const defaultHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#2563eb;padding:24px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">${appName}</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 10px 10px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
    <h2 style="color:#111;margin-top:0">Ticket Reassigned to ${providerName}</h2>
    <p>Hi ${assigneeName},</p>
    <p>Ticket <strong>#${ticket.ticket_number}</strong> has been reassigned to ${providerName}.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px">Ticket #</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${ticket.ticket_number}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Client</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${ticket.client_name || 'Not provided'}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Reassigned by</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${reassignerName}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Reason</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${reasonLabel}</td></tr>
      ${notes ? `<tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;vertical-align:top">Notes</td><td style="padding:8px 12px">${notes}</td></tr>` : ''}
    </table>
    <div style="text-align:center;margin:28px 0">
      <a href="${ticketUrl}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">View Ticket</a>
    </div>
    <p style="color:#6b7280;font-size:13px">You are receiving this because you have been assigned this ticket.</p>
  </div>
</body>
</html>`.trim()

  const { subject, html, text } = await resolveEmailTemplate({
    templateKey: 'ticket_reassigned_to_provider',
    defaultSubject: `Ticket #${ticket.ticket_number} reassigned to ${providerName}`,
    defaultHtml,
    variables: {
      app_name: appName,
      assignee_name: assigneeName,
      ticket_number: ticket.ticket_number,
      ticket_url: ticketUrl,
      provider_name: providerName,
      reassigner_name: reassignerName,
      reason: reasonLabel,
      notes: notes || '',
      client_name: ticket.client_name || 'Not provided',
    },
  })

  return sendEmail({
    to: assignee.email,
    subject,
    html,
    text,
  })
}

/**
 * Send notification to assignee when a ticket is assigned internally within the same provider
 */
export async function sendTicketAssignedInternallyNotification({
  ticket,
  assignee_user_id,
  assignedBy,
  notes,
}: {
  ticket: any
  assignee_user_id: string
  assignedBy: { full_name: string | null; email: string }
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const ticketUrl = `${appUrl}/dashboard/tickets/${ticket.id}`
  const assignerName = assignedBy.full_name || assignedBy.email

  // Get assignee email and name
  const supabase = await createServiceClient()
  const { data: assignee } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', assignee_user_id)
    .single()

  if (!assignee) {
    logger.warn('Assignee not found for internal assignment notification', { assignee_user_id })
    return { success: false, error: 'Assignee not found' }
  }

  const assigneeName = assignee.full_name || 'there'
  const providerName = ticket.provider?.name || 'your organization'

  const defaultHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#2563eb;padding:24px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">${appName}</h1>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 10px 10px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
    <h2 style="color:#111;margin-top:0">Ticket Assigned to You</h2>
    <p>Hi ${assigneeName},</p>
    <p>Ticket <strong>#${ticket.ticket_number}</strong> has been assigned to you by ${assignerName}.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px">Ticket #</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${ticket.ticket_number}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Client</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${ticket.client_name || 'Not provided'}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">Assigned by</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${assignerName}</td></tr>
      ${notes ? `<tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;vertical-align:top">Notes</td><td style="padding:8px 12px">${notes}</td></tr>` : ''}
    </table>
    <div style="text-align:center;margin:28px 0">
      <a href="${ticketUrl}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">View Ticket</a>
    </div>
    <p style="color:#6b7280;font-size:13px">You are receiving this because this ticket has been assigned to you.</p>
  </div>
</body>
</html>`.trim()

  const { subject, html, text } = await resolveEmailTemplate({
    templateKey: 'ticket_assigned_internally',
    defaultSubject: `Ticket #${ticket.ticket_number} assigned to you`,
    defaultHtml,
    variables: {
      app_name: appName,
      assignee_name: assigneeName,
      ticket_number: ticket.ticket_number,
      ticket_url: ticketUrl,
      provider_name: providerName,
      assigner_name: assignerName,
      notes: notes || '',
      client_name: ticket.client_name || 'Not provided',
    },
  })

  return sendEmail({
    to: assignee.email,
    subject,
    html,
    text,
  })
}
