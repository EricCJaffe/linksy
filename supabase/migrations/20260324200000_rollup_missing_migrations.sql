-- =============================================================================
-- ROLLUP: All missing migrations between 20260225223000 and 20260324134823
-- Safe to re-run (all statements are idempotent).
--
-- EXCLUDES (already applied):
--   20260307000001_provider_source_and_freeze.sql  (applied manually)
--   20260309000001_event_service_category_and_address.sql  (applied manually)
--   20260324000001_support_ticket_ai_triage.sql  (applied as 20260324134823)
--   20260324000002_support_ticket_ai_remediation.sql  (applied as 20260324134829)
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction.
--       This file is structured to run as a plain script (not wrapped in BEGIN/COMMIT).
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 0: ENUM VALUES (must be outside transaction)
-- From: 20260306000002, 20260312000002
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'in_process';
ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'transferred_another_provider';
ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'transferred_pending';

-- Restore contact type enum values dropped by remote_schema
ALTER TYPE linksy_contact_type ADD VALUE IF NOT EXISTS 'provider_admin';
ALTER TYPE linksy_contact_type ADD VALUE IF NOT EXISTS 'org_admin';


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: TICKET NUMBER SEQUENCE (from 20260303000001)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS linksy_ticket_number_seq START WITH 2001;

DO $$
DECLARE
  max_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(split_part(ticket_number, '-', 2) AS INTEGER)
  ), 2000) + 1
  INTO max_seq
  FROM linksy_tickets
  WHERE ticket_number IS NOT NULL AND ticket_number LIKE 'R-%';

  IF max_seq > 2001 THEN
    PERFORM setval('linksy_ticket_number_seq', max_seq, false);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION linksy_next_ticket_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'R-' || nextval('linksy_ticket_number_seq')::text || '-' || lpad((floor(random() * 100))::text, 2, '0');
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1b: RECREATE TABLES DROPPED BY remote_schema (20260225204403)
-- These tables were created by earlier migrations but dropped by remote_schema.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1b-i. linksy_host_custom_fields (from 20260224160100, dropped by remote_schema)
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

CREATE INDEX IF NOT EXISTS idx_host_custom_fields_host_active
  ON linksy_host_custom_fields(host_id, is_active, sort_order)
  WHERE is_active = true;

-- Recreate trigger only if table was just created (safe: DROP IF EXISTS + CREATE)
DROP TRIGGER IF EXISTS update_host_custom_fields_updated_at ON linksy_host_custom_fields;
CREATE TRIGGER update_host_custom_fields_updated_at
  BEFORE UPDATE ON linksy_host_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE linksy_host_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site admins can manage all host custom fields" ON linksy_host_custom_fields;
CREATE POLICY "Site admins can manage all host custom fields"
  ON linksy_host_custom_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'site_admin'));

DROP POLICY IF EXISTS "Host admins can manage their own custom fields" ON linksy_host_custom_fields;
CREATE POLICY "Host admins can manage their own custom fields"
  ON linksy_host_custom_fields FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM linksy_provider_contacts
    WHERE linksy_provider_contacts.provider_id = host_id
      AND linksy_provider_contacts.user_id = auth.uid()
      AND linksy_provider_contacts.status = 'active'
      AND linksy_provider_contacts.contact_type IN ('provider_admin', 'org_admin')
  ));

DROP POLICY IF EXISTS "Anyone can read active host custom fields" ON linksy_host_custom_fields;
CREATE POLICY "Anyone can read active host custom fields"
  ON linksy_host_custom_fields FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Ensure custom_data column on tickets (also from this migration)
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_tickets_custom_data
  ON linksy_tickets USING GIN (custom_data);

-- 1b-ii. linksy_host_email_templates (from 20260224160000, dropped by remote_schema)
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

CREATE INDEX IF NOT EXISTS idx_host_email_templates_host_key
  ON linksy_host_email_templates(host_id, template_key)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS update_host_email_templates_updated_at ON linksy_host_email_templates;
CREATE TRIGGER update_host_email_templates_updated_at
  BEFORE UPDATE ON linksy_host_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE linksy_host_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site admins can manage all host email templates" ON linksy_host_email_templates;
CREATE POLICY "Site admins can manage all host email templates"
  ON linksy_host_email_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'site_admin'));

DROP POLICY IF EXISTS "Host admins can manage their own email templates" ON linksy_host_email_templates;
CREATE POLICY "Host admins can manage their own email templates"
  ON linksy_host_email_templates FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM linksy_provider_contacts
    WHERE linksy_provider_contacts.provider_id = host_id
      AND linksy_provider_contacts.user_id = auth.uid()
      AND linksy_provider_contacts.status = 'active'
      AND linksy_provider_contacts.contact_type IN ('provider_admin', 'org_admin')
  ));


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: RLS SECURITY HARDENING (from 20260303000002)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 2a. linksy_provider_contacts — RLS was DISABLED
ALTER TABLE linksy_provider_contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "provider_contacts_site_admin_all" ON linksy_provider_contacts;
  DROP POLICY IF EXISTS "provider_contacts_read_own_provider" ON linksy_provider_contacts;
  DROP POLICY IF EXISTS "provider_contacts_admin_write" ON linksy_provider_contacts;
  DROP POLICY IF EXISTS "provider_contacts_admin_update" ON linksy_provider_contacts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "provider_contacts_site_admin_all"
  ON linksy_provider_contacts FOR ALL
  USING (is_site_admin())
  WITH CHECK (is_site_admin());

CREATE POLICY "provider_contacts_read_own_provider"
  ON linksy_provider_contacts FOR SELECT
  USING (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

CREATE POLICY "provider_contacts_admin_write"
  ON linksy_provider_contacts FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.provider_role = 'admin' AND pc.status = 'active'
    )
    OR is_site_admin()
  );

CREATE POLICY "provider_contacts_admin_update"
  ON linksy_provider_contacts FOR UPDATE
  USING (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.provider_role = 'admin' AND pc.status = 'active'
    )
    OR is_site_admin()
  );

-- 2b. linksy_provider_notes — is_private not enforced
DO $$ BEGIN
  DROP POLICY IF EXISTS "provider_notes_select" ON linksy_provider_notes;
  DROP POLICY IF EXISTS "Provider notes are viewable by site admins and provider contacts" ON linksy_provider_notes;
  DROP POLICY IF EXISTS "provider_notes_site_admin_read" ON linksy_provider_notes;
  DROP POLICY IF EXISTS "provider_notes_contact_read" ON linksy_provider_notes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "provider_notes_site_admin_read"
  ON linksy_provider_notes FOR SELECT
  USING (is_site_admin());

CREATE POLICY "provider_notes_contact_read"
  ON linksy_provider_notes FOR SELECT
  USING (
    is_private = false
    AND provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

-- 2c. linksy_tickets — client-view policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "tickets_client_view" ON linksy_tickets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "tickets_client_view"
  ON linksy_tickets FOR SELECT
  USING (
    client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 2d. linksy_call_logs — scope to provider contacts
DO $$ BEGIN
  DROP POLICY IF EXISTS "call_logs_read" ON linksy_call_logs;
  DROP POLICY IF EXISTS "call_logs_insert" ON linksy_call_logs;
  DROP POLICY IF EXISTS "call_logs_update" ON linksy_call_logs;
  DROP POLICY IF EXISTS "Enable read access for all users" ON linksy_call_logs;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON linksy_call_logs;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON linksy_call_logs;
  DROP POLICY IF EXISTS "call_logs_site_admin_all" ON linksy_call_logs;
  DROP POLICY IF EXISTS "call_logs_provider_contact_read" ON linksy_call_logs;
  DROP POLICY IF EXISTS "call_logs_provider_contact_insert" ON linksy_call_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "call_logs_site_admin_all"
  ON linksy_call_logs FOR ALL
  USING (is_site_admin());

CREATE POLICY "call_logs_provider_contact_read"
  ON linksy_call_logs FOR SELECT
  USING (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

CREATE POLICY "call_logs_provider_contact_insert"
  ON linksy_call_logs FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

-- 2e. linksy_host_custom_fields — scope to provider
DO $$ BEGIN
  DROP POLICY IF EXISTS "custom_fields_read" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "custom_fields_write" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "Enable read access for all users" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "host_custom_fields_site_admin" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "host_custom_fields_provider_admin_read" ON linksy_host_custom_fields;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "host_custom_fields_site_admin"
  ON linksy_host_custom_fields FOR ALL
  USING (is_site_admin());

CREATE POLICY "host_custom_fields_provider_admin_read"
  ON linksy_host_custom_fields FOR SELECT
  USING (
    host_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.provider_role = 'admin' AND pc.status = 'active'
    )
  );

-- 2f. linksy_surveys — restrict UPDATE
DO $$ BEGIN
  DROP POLICY IF EXISTS "surveys_update" ON linksy_surveys;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON linksy_surveys;
  DROP POLICY IF EXISTS "surveys_admin_update" ON linksy_surveys;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "surveys_admin_update"
  ON linksy_surveys FOR UPDATE
  USING (is_site_admin());

-- 2g. linksy_search_sessions — row filter on anon UPDATE
DO $$ BEGIN
  DROP POLICY IF EXISTS "search_sessions_anon_update" ON linksy_search_sessions;
  DROP POLICY IF EXISTS "Enable update for anon" ON linksy_search_sessions;
  DROP POLICY IF EXISTS "Allow anon update" ON linksy_search_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "search_sessions_anon_update"
  ON linksy_search_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: IS_TEST FLAG (from 20260306000001)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_is_test
  ON linksy_tickets (is_test) WHERE is_test = TRUE;

UPDATE linksy_tickets
  SET is_test = TRUE
  WHERE LOWER(TRIM(client_name)) = 'mega coolmint'
    AND is_test = FALSE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4: DUPLICATE FLAG (from 20260306000003 + 20260322000001, combined)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS duplicate_flag_type TEXT;

ALTER TABLE linksy_tickets
  DROP CONSTRAINT IF EXISTS linksy_tickets_duplicate_flag_type_check;

ALTER TABLE linksy_tickets
  ADD CONSTRAINT linksy_tickets_duplicate_flag_type_check
    CHECK (duplicate_flag_type IN ('case_a', 'case_b', 'case_c', 'case_d'));

COMMENT ON COLUMN linksy_tickets.duplicate_flag_type IS
  'Duplicate detection flag: case_a=5+ providers same service same day, case_b=same provider+service within 30 days (blocked), case_c=consecutive day same provider, case_d=same service category same week';

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_duplicate_flag
  ON linksy_tickets (duplicate_flag_type)
  WHERE duplicate_flag_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_provider_date
  ON linksy_tickets (client_email, provider_id, created_at DESC)
  WHERE client_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_phone_provider_date
  ON linksy_tickets (client_phone, provider_id, created_at DESC)
  WHERE client_phone IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5: PROVIDER NOTES — contact_id + tenant_id (from 20260307000002, 20260307000003)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE linksy_provider_notes
  ADD COLUMN IF NOT EXISTS contact_id UUID DEFAULT NULL
  REFERENCES linksy_provider_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_contact_id
  ON linksy_provider_notes(contact_id)
  WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN linksy_provider_notes.contact_id IS 'Optional: links note to a specific contact';

ALTER TABLE linksy_provider_notes
  ADD COLUMN IF NOT EXISTS created_by_tenant_id UUID REFERENCES tenants(id);

CREATE INDEX IF NOT EXISTS idx_provider_notes_tenant_id
  ON linksy_provider_notes(created_by_tenant_id)
  WHERE created_by_tenant_id IS NOT NULL;

COMMENT ON COLUMN linksy_provider_notes.created_by_tenant_id IS 'Tenant ID of the organization that created this note. Used for org-scoped private note visibility.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6: SEARCH SESSION TOKEN RLS (from 20260307000004)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE linksy_search_sessions
  ADD COLUMN IF NOT EXISTS session_token UUID NOT NULL DEFAULT gen_random_uuid();

UPDATE linksy_search_sessions SET session_token = gen_random_uuid() WHERE session_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_search_sessions_token ON linksy_search_sessions (session_token);

-- Replace the policy with the token-based one
DROP POLICY IF EXISTS "search_sessions_anon_update" ON linksy_search_sessions;
DROP POLICY IF EXISTS "sessions_anon_update" ON linksy_search_sessions;

CREATE POLICY "search_sessions_anon_update"
  ON linksy_search_sessions FOR UPDATE
  USING (
    session_token::text = coalesce(current_setting('app.session_token', true), '')
  )
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7: SEARCH EVENTS BY PROVIDERS RPC (from 20260307000005)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION linksy_search_events_by_providers(
  p_provider_ids UUID[],
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  recurrence_rule TEXT,
  provider_id UUID,
  provider_name TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.recurrence_rule,
    e.provider_id,
    p.name AS provider_name
  FROM linksy_provider_events e
  JOIN linksy_providers p ON p.id = e.provider_id
  WHERE e.provider_id = ANY(p_provider_ids)
    AND e.status = 'approved'
    AND e.is_public = true
    AND e.event_date > now()
  ORDER BY e.event_date ASC
  LIMIT p_limit;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 8: TENANT IS_ACTIVE (from 20260312000001)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE tenants SET is_active = false WHERE slug = 'impact-clay';


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 9: PHONE EXTENSION ON LOCATIONS + CONTACTS (from 20260321000001)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE linksy_locations
  ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

ALTER TABLE linksy_provider_contacts
  ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

ALTER TABLE linksy_provider_applications
  ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

ALTER TABLE linksy_provider_applications
  ADD COLUMN IF NOT EXISTS contact_phone_extension VARCHAR(20);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 10: DESCRIPTION REVIEWS (from 20260321000002)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_description_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  current_description TEXT,
  ai_suggested_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted_current', 'accepted_ai', 'edited', 'expired', 'error')),
  action_token UUID NOT NULL DEFAULT gen_random_uuid(),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  error_message TEXT,
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_description_reviews_provider ON linksy_description_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_description_reviews_status ON linksy_description_reviews(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_description_reviews_token ON linksy_description_reviews(action_token);
CREATE INDEX IF NOT EXISTS idx_description_reviews_batch ON linksy_description_reviews(batch_id) WHERE batch_id IS NOT NULL;

ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS next_description_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_description_review_at TIMESTAMPTZ;

INSERT INTO linksy_email_templates (template_key, name, description, subject_template, html_template, text_template)
VALUES (
  'description_review',
  'Provider Description Review',
  'Sent quarterly to providers asking them to review their description against AI-scanned website content.',
  'Action Required: Please Review Your {{provider_name}} Description',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #333;">Hello {{contact_name}},</h2>
<p>As part of our quarterly review process, we''ve compared your current provider description in our system with information found on your website. Please review the details below and let us know if any updates are needed.</p>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Your Current Description</h3>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">{{current_description}}</p>
</div>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">AI-Suggested Description (from your website)</h3>
<div style="background: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">{{ai_suggested_description}}</p>
</div>

<p><strong>Please choose one of the following options:</strong></p>

<div style="margin: 20px 0;">
<a href="{{accept_current_url}}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">No Changes Needed</a>
<a href="{{accept_ai_url}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">Use AI Suggestion</a>
<a href="{{edit_url}}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-bottom: 10px;">Log In &amp; Edit</a>
</div>

<p style="color: #666; font-size: 14px;">This link expires in 30 days. If you have any questions, please contact us at {{support_email}}.</p>
<p style="color: #999; font-size: 12px;">Sent by {{app_name}}</p>
</div>',
  'Hello {{contact_name}},

As part of our quarterly review process, we''ve compared your current provider description with information found on your website.

YOUR CURRENT DESCRIPTION:
{{current_description}}

AI-SUGGESTED DESCRIPTION (from your website):
{{ai_suggested_description}}

Please choose one of the following options:
- No Changes Needed: {{accept_current_url}}
- Use AI Suggestion: {{accept_ai_url}}
- Log In & Edit: {{edit_url}}

This link expires in 30 days.
Sent by {{app_name}}'
)
ON CONFLICT (template_key) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 11: CALL LOG TIMER + REFERRAL ALERTS + SLA (from rollup 20260323000001)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 11a. Call log timer fields
ALTER TABLE linksy_call_logs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

ALTER TABLE linksy_call_logs
  DROP CONSTRAINT IF EXISTS call_log_time_order;
ALTER TABLE linksy_call_logs
  ADD CONSTRAINT call_log_time_order
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at);

-- 11b. Referral alert config
CREATE TABLE IF NOT EXISTS linksy_referral_alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  threshold_hours integer NOT NULL DEFAULT 48,
  notify_emails text[] NOT NULL DEFAULT '{}',
  notify_site_admins boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id)
);

ALTER TABLE linksy_referral_alert_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_admins_manage_referral_alert_config" ON linksy_referral_alert_config;
CREATE POLICY "site_admins_manage_referral_alert_config"
  ON linksy_referral_alert_config
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 11c. SLA reminder system
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS sla_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS sla_reminder_hours integer NOT NULL DEFAULT 48;

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS sla_reminder_sent_at timestamptz;

ALTER TABLE linksy_referral_alert_config
  ADD COLUMN IF NOT EXISTS sla_reminder_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION linksy_set_sla_due_at()
RETURNS trigger AS $$
DECLARE
  provider_sla_hours integer;
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT sla_hours INTO provider_sla_hours
      FROM linksy_providers WHERE id = NEW.provider_id;
    END IF;
    NEW.sla_due_at := NEW.created_at + make_interval(hours => COALESCE(provider_sla_hours, 24));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE linksy_providers
  SET sla_hours = 24, sla_reminder_hours = 48
  WHERE sla_hours IS NULL OR sla_reminder_hours IS NULL;

UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.status = 'pending'
    AND t.sla_due_at IS NOT NULL;

UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.sla_due_at IS NULL;

UPDATE linksy_tickets
  SET sla_due_at = created_at + interval '24 hours'
  WHERE sla_due_at IS NULL AND provider_id IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 12: TICKET STATUS REASONS (from 20260324000003)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_ticket_status_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_status TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_status_reasons_tenant_status
  ON linksy_ticket_status_reasons(tenant_id, parent_status);

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS status_reason_id UUID REFERENCES linksy_ticket_status_reasons(id) ON DELETE SET NULL;

ALTER TABLE linksy_ticket_status_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view status reasons" ON linksy_ticket_status_reasons;
CREATE POLICY "Tenant members can view status reasons"
  ON linksy_ticket_status_reasons FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage status reasons" ON linksy_ticket_status_reasons;
CREATE POLICY "Admins can manage status reasons"
  ON linksy_ticket_status_reasons FOR ALL
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      JOIN users u ON u.id = tu.user_id
      WHERE tu.user_id = auth.uid() AND (tu.role = 'admin' OR u.role = 'site_admin')
    )
  );

-- Seed default reasons (only if table is empty to avoid duplicates on re-run)
INSERT INTO linksy_ticket_status_reasons (tenant_id, parent_status, label, sort_order)
SELECT t.id, 'unable_to_assist', r.label, r.sort_order
FROM tenants t
CROSS JOIN (VALUES
  ('Out of Funds', 1),
  ('Minimal Staff Support', 2),
  ('Waiting List (Full)', 3),
  ('Out of Materials', 4),
  ('Unable to Refer', 5),
  ('Wrong Zip Code', 6),
  ('Other', 7)
) AS r(label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM linksy_ticket_status_reasons LIMIT 1);


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE. The seed_help_docs (20260322000003) is data-only and excluded from
-- this schema rollup. Run it separately if needed.
-- ═══════════════════════════════════════════════════════════════════════════════
