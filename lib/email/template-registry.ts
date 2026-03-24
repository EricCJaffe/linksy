export const EMAIL_TEMPLATE_KEYS = [
  'invitation',
  'ticket_new_assignment',
  'ticket_status_update',
  'ticket_status_in_process',
  'ticket_status_transferred',
  'ticket_forwarded_to_admin',
  'ticket_reassigned_to_provider',
  'ticket_assigned_internally',
  'description_review',
  'stale_referral_alert',
  'sla_reminder',
  'support_ticket_triage',
] as const

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number]

export interface EmailTemplateDefinition {
  key: EmailTemplateKey
  name: string
  description: string
  placeholders: string[]
}

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {
    key: 'invitation',
    name: 'User Invitation',
    description: 'Sent when inviting a user into an organization.',
    placeholders: ['app_name', 'app_url', 'email', 'inviter_name', 'tenant_name', 'role', 'invite_url'],
  },
  {
    key: 'ticket_new_assignment',
    name: 'New Referral Assigned',
    description: 'Sent to default referral handler when a new referral is assigned.',
    placeholders: [
      'app_name',
      'to',
      'contact_name',
      'ticket_number',
      'client_name',
      'need_name',
      'description',
      'provider_name',
      'ticket_url',
    ],
  },
  {
    key: 'ticket_status_update',
    name: 'Referral Status Update',
    description: 'Sent to the client when a referral status changes.',
    placeholders: [
      'app_name',
      'to',
      'client_name',
      'ticket_number',
      'new_status',
      'status_label',
      'provider_name',
      'need_name',
    ],
  },
  {
    key: 'ticket_status_in_process',
    name: 'Referral In Process',
    description: 'Sent to the client when a referral is marked as In Process.',
    placeholders: [
      'app_name',
      'to',
      'client_name',
      'ticket_number',
      'provider_name',
      'need_name',
    ],
  },
  {
    key: 'ticket_status_transferred',
    name: 'Referral Transferred',
    description: 'Sent to the client when a referral is transferred to another provider.',
    placeholders: [
      'app_name',
      'to',
      'client_name',
      'ticket_number',
      'provider_name',
      'new_provider_name',
      'need_name',
    ],
  },
  {
    key: 'ticket_forwarded_to_admin',
    name: 'Referral Transferred to Admin Pool',
    description: 'Sent to site admins when a provider transfers a referral to the admin pool.',
    placeholders: [
      'app_name',
      'ticket_number',
      'ticket_url',
      'forwarder_name',
      'reason',
      'notes',
    ],
  },
  {
    key: 'ticket_reassigned_to_provider',
    name: 'Referral Reassigned to Provider',
    description: 'Sent to the assignee when a referral is reassigned to a provider.',
    placeholders: [
      'app_name',
      'assignee_name',
      'ticket_number',
      'ticket_url',
      'provider_name',
      'reassigner_name',
      'reason',
      'notes',
      'client_name',
    ],
  },
  {
    key: 'ticket_assigned_internally',
    name: 'Referral Assigned Internally',
    description: 'Sent to the assignee when a referral is assigned internally within the same provider.',
    placeholders: [
      'app_name',
      'assignee_name',
      'ticket_number',
      'ticket_url',
      'provider_name',
      'assigner_name',
      'notes',
      'client_name',
    ],
  },
  {
    key: 'description_review',
    name: 'Provider Description Review',
    description: 'Sent quarterly to providers asking them to review their description against AI-scanned website content.',
    placeholders: [
      'app_name',
      'contact_name',
      'provider_name',
      'current_description',
      'ai_suggested_description',
      'accept_current_url',
      'accept_ai_url',
      'edit_url',
      'support_email',
    ],
  },
  {
    key: 'stale_referral_alert',
    name: 'Stale Referral Alert',
    description: 'Sent daily to designated recipients when referrals stay Pending longer than the configured threshold.',
    placeholders: [
      'app_name',
      'total_count',
      'threshold_hours',
      'threshold_days',
      'age_breakdown',
      'ticket_table',
      'dashboard_url',
    ],
  },
  {
    key: 'sla_reminder',
    name: 'SLA Reminder',
    description: 'Sent to the provider\'s default referral handler when a referral has been pending past the provider\'s SLA reminder threshold.',
    placeholders: [
      'app_name',
      'contact_name',
      'provider_name',
      'ticket_number',
      'client_name',
      'need_name',
      'hours_pending',
      'days_pending',
      'sla_hours',
      'ticket_url',
    ],
  },
  {
    key: 'support_ticket_triage',
    name: 'Support Ticket AI Triage',
    description: 'Sent to the admin when AI triage completes analysis of a support ticket.',
    placeholders: [
      'app_name',
      'ticket_number',
      'subject',
      'severity',
      'classification',
      'root_cause',
      'suggested_fix',
      'remediation_prompt',
      'ticket_url',
    ],
  },
]

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return EMAIL_TEMPLATE_KEYS.includes(value as EmailTemplateKey)
}
