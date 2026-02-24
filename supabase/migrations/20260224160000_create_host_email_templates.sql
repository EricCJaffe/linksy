-- Host-specific email template overrides
-- Allows each host to customize email templates sent from their widget

CREATE TABLE IF NOT EXISTS linksy_host_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(host_id, template_key)
);

COMMENT ON TABLE linksy_host_email_templates IS 'Host-specific email template overrides for white-label branding';
COMMENT ON COLUMN linksy_host_email_templates.host_id IS 'Provider that owns this template (must be a host)';
COMMENT ON COLUMN linksy_host_email_templates.template_key IS 'Template identifier (e.g., new_referral_to_provider, referral_status_update)';
COMMENT ON COLUMN linksy_host_email_templates.name IS 'Human-readable template name';
COMMENT ON COLUMN linksy_host_email_templates.subject IS 'Email subject line (supports {{variables}})';
COMMENT ON COLUMN linksy_host_email_templates.body_html IS 'Email body HTML (supports {{variables}})';
COMMENT ON COLUMN linksy_host_email_templates.variables IS 'Available template variables (e.g., provider_name, client_name, custom_fields)';
COMMENT ON COLUMN linksy_host_email_templates.is_active IS 'Whether to use this template (false = use system default)';

-- Index for efficient lookups
CREATE INDEX idx_host_email_templates_host_key
ON linksy_host_email_templates(host_id, template_key)
WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_host_email_templates_updated_at
  BEFORE UPDATE ON linksy_host_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Site admins and host admins can manage templates
ALTER TABLE linksy_host_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site admins can manage all host email templates"
ON linksy_host_email_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'site_admin'
  )
);

CREATE POLICY "Host admins can manage their own email templates"
ON linksy_host_email_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM linksy_provider_contacts
    WHERE linksy_provider_contacts.provider_id = host_id
    AND linksy_provider_contacts.user_id = auth.uid()
    AND linksy_provider_contacts.status = 'active'
    AND linksy_provider_contacts.contact_type IN ('provider_admin', 'org_admin')
  )
);

-- Seed default template keys with descriptions
INSERT INTO linksy_docs (
  title,
  slug,
  content,
  excerpt,
  category,
  min_role,
  is_published,
  sort_order
) VALUES (
  'Host Email Template Variables',
  'host-email-template-variables',
  E'# Available Template Variables

## Common Variables (All Templates)
- `{{host_name}}` - Host organization name
- `{{host_website}}` - Host website URL
- `{{host_phone}}` - Host phone number
- `{{host_email}}` - Host email address

## new_referral_to_provider
Sent to provider when new referral is created via host widget.

**Variables:**
- `{{provider_name}}` - Provider organization name
- `{{client_name}}` - Client name
- `{{client_email}}` - Client email
- `{{client_phone}}` - Client phone
- `{{need_category}}` - Need category name
- `{{need_name}}` - Specific need name
- `{{description}}` - Client description of need
- `{{custom_fields}}` - Formatted custom field responses (if any)
- `{{ticket_number}}` - Referral ticket number
- `{{ticket_url}}` - Link to view ticket in dashboard

## referral_status_update
Sent to client when referral status changes.

**Variables:**
- `{{client_name}}` - Client name
- `{{provider_name}}` - Provider organization name
- `{{old_status}}` - Previous status
- `{{new_status}}` - New status
- `{{ticket_number}}` - Referral ticket number
- `{{message}}` - Optional message from provider

## custom_form_submission
Sent to host when custom intake form is submitted (optional).

**Variables:**
- `{{client_name}}` - Client name
- `{{client_email}}` - Client email
- `{{custom_fields}}` - Formatted custom field responses
- `{{submission_date}}` - Date/time of submission',
  'Reference guide for email template variables available to host administrators',
  'documentation',
  'site_admin',
  true,
  100
) ON CONFLICT (slug) DO NOTHING;
