-- Email template customization overrides
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS linksy_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linksy_email_templates_active
  ON linksy_email_templates(is_active);

CREATE OR REPLACE FUNCTION linksy_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_linksy_email_templates_updated_at ON linksy_email_templates;
CREATE TRIGGER update_linksy_email_templates_updated_at
  BEFORE UPDATE ON linksy_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION linksy_set_updated_at();

-- RLS intentionally omitted here to avoid hard dependency on helper functions
-- in older environments. Access is enforced by server-side site-admin checks.
