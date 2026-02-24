export const EMAIL_TEMPLATE_KEYS = [
  'invitation',
  'ticket_new_assignment',
  'ticket_status_update',
  'ticket_forwarded_to_admin',
  'ticket_reassigned_to_provider',
  'ticket_assigned_internally',
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
    description: 'Sent to default referral handler when a new referral ticket is assigned.',
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
    description: 'Sent to the client when a referral ticket status changes.',
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
    key: 'ticket_forwarded_to_admin',
    name: 'Ticket Forwarded to Admin Pool',
    description: 'Sent to site admins when a provider forwards a ticket to the admin pool.',
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
    name: 'Ticket Reassigned to Provider',
    description: 'Sent to the assignee when a ticket is reassigned to a provider.',
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
    name: 'Ticket Assigned Internally',
    description: 'Sent to the assignee when a ticket is assigned internally within the same provider.',
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
]

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return EMAIL_TEMPLATE_KEYS.includes(value as EmailTemplateKey)
}
