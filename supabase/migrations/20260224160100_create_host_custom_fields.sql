-- Host custom intake form fields
-- Allows hosts to add custom questions before referral submission

CREATE TABLE IF NOT EXISTS linksy_host_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  field_label VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'checkbox', 'date', 'email', 'phone')),
  field_options TEXT[] DEFAULT '{}',
  placeholder VARCHAR(200),
  help_text VARCHAR(500),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE linksy_host_custom_fields IS 'Custom intake form fields configured by hosts';
COMMENT ON COLUMN linksy_host_custom_fields.host_id IS 'Provider that owns this field (must be a host)';
COMMENT ON COLUMN linksy_host_custom_fields.field_label IS 'Label displayed to user (e.g., "How did you hear about us?")';
COMMENT ON COLUMN linksy_host_custom_fields.field_type IS 'Input type: text, textarea, select, checkbox, date, email, phone';
COMMENT ON COLUMN linksy_host_custom_fields.field_options IS 'Options for select fields (e.g., ["Option 1", "Option 2"])';
COMMENT ON COLUMN linksy_host_custom_fields.placeholder IS 'Placeholder text for input fields';
COMMENT ON COLUMN linksy_host_custom_fields.help_text IS 'Helper text shown below field';
COMMENT ON COLUMN linksy_host_custom_fields.is_required IS 'Whether field must be filled before submission';
COMMENT ON COLUMN linksy_host_custom_fields.sort_order IS 'Display order (lower = shown first)';
COMMENT ON COLUMN linksy_host_custom_fields.is_active IS 'Whether to show this field in the form';

-- Index for efficient lookups
CREATE INDEX idx_host_custom_fields_host_active
ON linksy_host_custom_fields(host_id, is_active, sort_order)
WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_host_custom_fields_updated_at
  BEFORE UPDATE ON linksy_host_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Site admins and host admins can manage fields
ALTER TABLE linksy_host_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site admins can manage all host custom fields"
ON linksy_host_custom_fields
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'site_admin'
  )
);

CREATE POLICY "Host admins can manage their own custom fields"
ON linksy_host_custom_fields
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

-- Public read for active fields (widget needs to fetch them)
CREATE POLICY "Anyone can read active host custom fields"
ON linksy_host_custom_fields
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Add custom_data JSONB column to linksy_tickets to store responses
ALTER TABLE linksy_tickets
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN linksy_tickets.custom_data IS 'Custom field responses from host intake form (key-value pairs)';

-- Index for querying custom data
CREATE INDEX IF NOT EXISTS idx_tickets_custom_data
ON linksy_tickets USING GIN (custom_data);
