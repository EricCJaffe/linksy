/**
 * Email service utility for sending transactional emails
 *
 * Supports two email providers:
 * 1. Resend (recommended) - Set RESEND_API_KEY
 * 2. SMTP (fallback) - Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 *
 * If neither is configured, emails will be logged to console in development.
 */

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

/**
 * Send an email using the configured email service
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@example.com'
  const fromName = process.env.SMTP_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'SaaS App'

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

/**
 * Send an invitation email to a new user
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'SaaS App'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const html = `
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
      <strong>${data.inviterName}</strong> has invited you to join <strong>${data.tenantName}</strong> on ${appName} as ${data.role === 'admin' ? 'an administrator' : 'a member'}.
    </p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your role:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #667eea;">
        ${data.role === 'admin' ? '👑 Administrator' : '👤 Team Member'}
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

  const text = `
You've been invited to ${appName}!

${data.inviterName} has invited you to join ${data.tenantName} as ${data.role === 'admin' ? 'an administrator' : 'a member'}.

Click the link below to accept the invitation and create your account:
${data.inviteUrl}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.

---
${appName}
${appUrl}
  `.trim()

  return sendEmail({
    to: data.email,
    subject: `You've been invited to join ${data.tenantName} on ${appName}`,
    html,
    text,
  })
}
