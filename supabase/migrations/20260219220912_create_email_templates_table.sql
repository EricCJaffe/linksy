
CREATE TABLE IF NOT EXISTS linksy_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed with existing hardcoded templates
INSERT INTO linksy_email_templates (slug, name, subject, body_html, variables) VALUES
  ('new_ticket_notification', 'New Ticket Notification', 'New referral ticket #{{ticketNumber}} — {{providerName}}', '<p>Template managed in code. Edit to customize.</p>', '["contactName","ticketNumber","clientName","needName","description","providerName","ticketUrl"]'::jsonb),
  ('ticket_status_update', 'Ticket Status Update', 'Your referral status has been updated — {{statusLabel}}', '<p>Template managed in code. Edit to customize.</p>', '["clientName","ticketNumber","newStatus","providerName","needName"]'::jsonb),
  ('invitation', 'User Invitation', 'You''ve been invited to join {{tenantName}} on {{appName}}', '<p>Template managed in code. Edit to customize.</p>', '["inviterName","tenantName","role","inviteUrl"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE linksy_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read email templates" ON linksy_email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage email templates" ON linksy_email_templates
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
;
