import { NextResponse } from 'next/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { sendEmail } from '@/lib/utils/email'

export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const { to, subject, body_html } = body

  if (!to || !subject || !body_html) {
    return NextResponse.json(
      { error: 'to, subject, and body_html are required' },
      { status: 400 }
    )
  }

  // Replace template variables with sample values for the test
  const sampleVars: Record<string, string> = {
    app_name: process.env.NEXT_PUBLIC_APP_NAME || 'Linksy',
    app_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    contact_name: 'Jane Smith',
    client_name: 'John Doe',
    provider_name: 'Sample Provider Org',
    need_name: 'Rental Assistance',
    ticket_number: 'R-0000-00',
    ticket_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tickets/00000000-0000-0000-0000-000000000000`,
    status_label: 'In Process',
    new_status: 'in_process',
    description: 'This is a sample description for testing purposes.',
    custom_fields: '',
    to: to,
    email: to,
    inviter_name: 'Admin User',
    tenant_name: 'Sample Tenant',
    role: 'member',
    invite_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/sample-token`,
    new_provider_name: 'New Provider Org',
    forwarder_name: 'Provider Contact',
    reason: 'Unable to assist',
    notes: 'Sample notes for testing.',
    assignee_name: 'Jane Smith',
    reassigner_name: 'Admin User',
    assigner_name: 'Provider Admin',
    total_count: '5',
    threshold_hours: '48',
    threshold_days: '2',
    age_breakdown: '<p>2-3 days: 3 referrals<br/>3+ days: 2 referrals</p>',
    ticket_table: '<p>(Sample ticket table)</p>',
    dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    hours_pending: '52',
    days_pending: '2',
    sla_hours: '48',
    severity: 'HIGH',
    classification: 'bug',
    root_cause: 'Sample root cause hypothesis.',
    suggested_fix: 'Sample suggested fix approach.',
    remediation_prompt: 'Sample remediation prompt for AI coding assistant.',
    support_email: process.env.ADMIN_EMAIL || 'support@example.com',
    current_description: 'Current provider description text.',
    ai_suggested_description: 'AI-suggested provider description text.',
    accept_current_url: '#',
    accept_ai_url: '#',
    edit_url: '#',
    subject: 'Sample support ticket subject',
    // Legacy variable names (camelCase)
    contactName: 'Jane Smith',
    clientName: 'John Doe',
    providerName: 'Sample Provider Org',
    needName: 'Rental Assistance',
    ticketNumber: 'R-0000-00',
    ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tickets/00000000-0000-0000-0000-000000000000`,
    statusLabel: 'In Process',
    newStatus: 'in_process',
    inviterName: 'Admin User',
    tenantName: 'Sample Tenant',
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/sample-token`,
  }

  // Render template with sample variables
  const renderedSubject = subject.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_: string, key: string) => sampleVars[key] ?? `{{${key}}}`
  )
  const renderedHtml = body_html.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_: string, key: string) => sampleVars[key] ?? `{{${key}}}`
  )

  const result = await sendEmail({
    to,
    subject: `[TEST] ${renderedSubject}`,
    html: renderedHtml,
  })

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to send test email' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: `Test email sent to ${to}` })
}
