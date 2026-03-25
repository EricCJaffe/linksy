-- Email templates: add description + trigger_event columns, seed all 13 system templates
-- Safe to re-run (all statements are idempotent)

-- 1. Add new columns
ALTER TABLE linksy_email_templates
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS trigger_event TEXT;

COMMENT ON COLUMN linksy_email_templates.trigger_event IS 'Future: the system event that sends this template (e.g. ticket.created). Not yet wired up.';

-- 2. Seed all 13 system templates (skip if already exists by slug)
INSERT INTO linksy_email_templates (slug, name, description, subject, body_html, variables) VALUES
  (
    'invitation',
    'User Invitation',
    'Sent when inviting a user into an organization.',
    'You''ve been invited to join {{tenantName}} on {{appName}}',
    '<p>Hello,</p><p>{{inviterName}} has invited you to join <strong>{{tenantName}}</strong> as a {{role}}.</p><p><a href="{{inviteUrl}}">Accept Invitation</a></p>',
    '["app_name","app_url","email","inviter_name","tenant_name","role","invite_url"]'::jsonb
  ),
  (
    'ticket_new_assignment',
    'New Referral Assigned',
    'Sent to the default referral handler when a new referral is assigned.',
    'New referral ticket #{{ticket_number}} — {{provider_name}}',
    '<p>Hello {{contact_name}},</p><p>A new referral has been submitted to <strong>{{provider_name}}</strong>.</p><p><strong>Ticket:</strong> {{ticket_number}}<br/><strong>Client:</strong> {{client_name}}<br/><strong>Service:</strong> {{need_name}}<br/><strong>Description:</strong> {{description}}</p><p>{{custom_fields}}</p><p><a href="{{ticket_url}}">View Referral</a></p>',
    '["app_name","to","contact_name","ticket_number","client_name","need_name","description","provider_name","ticket_url","custom_fields"]'::jsonb
  ),
  (
    'ticket_status_update',
    'Referral Status Update',
    'Sent to the client when a referral status changes.',
    'Your referral status has been updated — {{status_label}}',
    '<p>Hello {{client_name}},</p><p>Your referral <strong>{{ticket_number}}</strong> with <strong>{{provider_name}}</strong> has been updated to: <strong>{{status_label}}</strong>.</p><p>Service: {{need_name}}</p>',
    '["app_name","to","client_name","ticket_number","new_status","status_label","provider_name","need_name"]'::jsonb
  ),
  (
    'ticket_status_in_process',
    'Referral In Process',
    'Sent to the client when a referral is marked as In Process.',
    'Your referral {{ticket_number}} is now being processed',
    '<p>Hello {{client_name}},</p><p>Good news! Your referral <strong>{{ticket_number}}</strong> with <strong>{{provider_name}}</strong> is now being processed.</p><p>Service: {{need_name}}</p>',
    '["app_name","to","client_name","ticket_number","provider_name","need_name"]'::jsonb
  ),
  (
    'ticket_status_transferred',
    'Referral Transferred',
    'Sent to the client when a referral is transferred to another provider.',
    'Your referral {{ticket_number}} has been transferred',
    '<p>Hello {{client_name}},</p><p>Your referral <strong>{{ticket_number}}</strong> has been transferred from {{provider_name}} to <strong>{{new_provider_name}}</strong> to better serve your needs.</p><p>Service: {{need_name}}</p>',
    '["app_name","to","client_name","ticket_number","provider_name","new_provider_name","need_name"]'::jsonb
  ),
  (
    'ticket_forwarded_to_admin',
    'Referral Transferred to Admin Pool',
    'Sent to site admins when a provider transfers a referral to the admin pool.',
    'Referral {{ticket_number}} forwarded to admin pool',
    '<p>Referral <strong>{{ticket_number}}</strong> has been forwarded to the admin pool by {{forwarder_name}}.</p><p><strong>Reason:</strong> {{reason}}</p><p>{{notes}}</p><p><a href="{{ticket_url}}">View Referral</a></p>',
    '["app_name","ticket_number","ticket_url","forwarder_name","reason","notes"]'::jsonb
  ),
  (
    'ticket_reassigned_to_provider',
    'Referral Reassigned to Provider',
    'Sent to the assignee when a referral is reassigned to a different provider.',
    'Referral {{ticket_number}} has been reassigned to you',
    '<p>Hello {{assignee_name}},</p><p>Referral <strong>{{ticket_number}}</strong> for client {{client_name}} has been reassigned to <strong>{{provider_name}}</strong> by {{reassigner_name}}.</p><p><strong>Reason:</strong> {{reason}}</p><p>{{notes}}</p><p><a href="{{ticket_url}}">View Referral</a></p>',
    '["app_name","assignee_name","ticket_number","ticket_url","provider_name","reassigner_name","reason","notes","client_name"]'::jsonb
  ),
  (
    'ticket_assigned_internally',
    'Referral Assigned Internally',
    'Sent to the assignee when a referral is assigned internally within the same provider.',
    'Referral {{ticket_number}} has been assigned to you',
    '<p>Hello {{assignee_name}},</p><p>Referral <strong>{{ticket_number}}</strong> for client {{client_name}} at <strong>{{provider_name}}</strong> has been assigned to you by {{assigner_name}}.</p><p>{{notes}}</p><p><a href="{{ticket_url}}">View Referral</a></p>',
    '["app_name","assignee_name","ticket_number","ticket_url","provider_name","assigner_name","notes","client_name"]'::jsonb
  ),
  (
    'description_review',
    'Provider Description Review',
    'Sent quarterly to providers asking them to review their description against AI-scanned website content.',
    'Action Required: Please Review Your {{provider_name}} Description',
    '<p>Hello {{contact_name}},</p><p>As part of our quarterly review, we''ve compared your current description for <strong>{{provider_name}}</strong> with information on your website.</p><p><strong>Current:</strong></p><div>{{current_description}}</div><p><strong>AI Suggested:</strong></p><div>{{ai_suggested_description}}</div><p><a href="{{accept_current_url}}">Keep Current</a> | <a href="{{accept_ai_url}}">Accept Suggested</a> | <a href="{{edit_url}}">Edit Manually</a></p>',
    '["app_name","contact_name","provider_name","current_description","ai_suggested_description","accept_current_url","accept_ai_url","edit_url","support_email"]'::jsonb
  ),
  (
    'stale_referral_alert',
    'Stale Referral Alert',
    'Sent daily to designated recipients when referrals stay Pending longer than the configured threshold.',
    '{{total_count}} referrals pending over {{threshold_hours}} hours',
    '<p>There are <strong>{{total_count}}</strong> referrals that have been pending for more than {{threshold_hours}} hours ({{threshold_days}} days).</p><div>{{age_breakdown}}</div><div>{{ticket_table}}</div><p><a href="{{dashboard_url}}">View Dashboard</a></p>',
    '["app_name","total_count","threshold_hours","threshold_days","age_breakdown","ticket_table","dashboard_url"]'::jsonb
  ),
  (
    'sla_reminder',
    'SLA Reminder',
    'Sent to the provider''s default referral handler when a referral has been pending past the SLA reminder threshold.',
    'SLA Reminder: Referral {{ticket_number}} has been pending {{hours_pending}} hours',
    '<p>Hello {{contact_name}},</p><p>Referral <strong>{{ticket_number}}</strong> for client {{client_name}} at <strong>{{provider_name}}</strong> has been pending for {{hours_pending}} hours ({{days_pending}} days), which exceeds the {{sla_hours}}-hour SLA threshold.</p><p>Service: {{need_name}}</p><p><a href="{{ticket_url}}">View Referral</a></p>',
    '["app_name","contact_name","provider_name","ticket_number","client_name","need_name","hours_pending","days_pending","sla_hours","ticket_url"]'::jsonb
  ),
  (
    'support_ticket_triage',
    'Support Ticket AI Triage',
    'Sent to the admin when AI triage completes analysis of a support ticket.',
    '[{{severity}}] AI Triage: {{ticket_number}} — {{subject}}',
    '<p><strong>AI Triage Report for {{ticket_number}}</strong></p><p><strong>Subject:</strong> {{subject}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Classification:</strong> {{classification}}</p><p><strong>Root Cause:</strong> {{root_cause}}</p><p><strong>Suggested Fix:</strong> {{suggested_fix}}</p><pre>{{remediation_prompt}}</pre><p><a href="{{ticket_url}}">View Ticket</a></p>',
    '["app_name","ticket_number","subject","severity","classification","root_cause","suggested_fix","remediation_prompt","ticket_url"]'::jsonb
  ),
  (
    'new_ticket_notification',
    'New Ticket Notification (Legacy)',
    'Legacy notification sent when a new ticket is created. Consider using ticket_new_assignment instead.',
    'New referral ticket #{{ticketNumber}} — {{providerName}}',
    '<p>Hello {{contactName}},</p><p>A new referral has been submitted.</p><p><strong>Ticket:</strong> {{ticketNumber}}<br/><strong>Client:</strong> {{clientName}}<br/><strong>Service:</strong> {{needName}}<br/><strong>Provider:</strong> {{providerName}}</p><p>{{description}}</p><p><a href="{{ticketUrl}}">View Referral</a></p>',
    '["contactName","ticketNumber","clientName","needName","description","providerName","ticketUrl"]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  description = COALESCE(EXCLUDED.description, linksy_email_templates.description),
  variables = EXCLUDED.variables;

-- 3. Backfill trigger_event for known system templates
UPDATE linksy_email_templates SET trigger_event = 'user.invited' WHERE slug = 'invitation' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.created' WHERE slug = 'ticket_new_assignment' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.status_changed' WHERE slug = 'ticket_status_update' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.status_changed' WHERE slug = 'ticket_status_in_process' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.forwarded' WHERE slug = 'ticket_status_transferred' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.forwarded' WHERE slug = 'ticket_forwarded_to_admin' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.reassigned' WHERE slug = 'ticket_reassigned_to_provider' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.assigned' WHERE slug = 'ticket_assigned_internally' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'provider.description_review' WHERE slug = 'description_review' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'referral.stale_alert' WHERE slug = 'stale_referral_alert' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'referral.sla_reminder' WHERE slug = 'sla_reminder' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'support_ticket.triage_complete' WHERE slug = 'support_ticket_triage' AND trigger_event IS NULL;
UPDATE linksy_email_templates SET trigger_event = 'ticket.created' WHERE slug = 'new_ticket_notification' AND trigger_event IS NULL;
