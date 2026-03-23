-- =============================================================================
-- ROLLUP: Consolidates the last 4 migration scripts into one safe, idempotent file
-- Source scripts:
--   20260321000003_call_log_timer_fields.sql
--   20260321000004_create_referral_alert_config.sql
--   20260322000001_add_case_d_duplicate_flag.sql  (FIXED: now creates column first)
--   20260322000002_sla_reminder_system.sql
--
-- NOTE: 20260322000003_seed_help_docs.sql is NOT included here (data seed, no schema).
--       Run it separately after this rollup if needed.
--
-- Prerequisites: linksy_tickets, linksy_call_logs, linksy_providers tables must exist.
-- Safe to re-run (all statements are idempotent).
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) CALL LOG TIMER FIELDS  (from 20260321000003)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE linksy_call_logs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

ALTER TABLE linksy_call_logs
  DROP CONSTRAINT IF EXISTS call_log_time_order;
ALTER TABLE linksy_call_logs
  ADD CONSTRAINT call_log_time_order
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at);

COMMENT ON COLUMN linksy_call_logs.started_at IS 'Call start time — set automatically by timer or manually entered';
COMMENT ON COLUMN linksy_call_logs.ended_at IS 'Call end time — set automatically by timer or manually entered';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) REFERRAL ALERT CONFIG TABLE  (from 20260321000004)
-- ─────────────────────────────────────────────────────────────────────────────

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

COMMENT ON TABLE linksy_referral_alert_config IS 'Per-site configuration for automated stale referral email alerts';
COMMENT ON COLUMN linksy_referral_alert_config.threshold_hours IS 'Hours a referral can stay Pending before triggering an alert (e.g. 48 = 2 days)';
COMMENT ON COLUMN linksy_referral_alert_config.notify_emails IS 'Explicit email addresses to notify (in addition to or instead of site admins)';
COMMENT ON COLUMN linksy_referral_alert_config.notify_site_admins IS 'When true, also sends alert to all users with site_admin role';

ALTER TABLE linksy_referral_alert_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_admins_manage_referral_alert_config" ON linksy_referral_alert_config;
CREATE POLICY "site_admins_manage_referral_alert_config"
  ON linksy_referral_alert_config
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) DUPLICATE FLAG ON TICKETS  (from 20260306000003 + 20260322000001 combined)
--    Creates the column if missing, then sets the constraint to include case_d.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add the column (safe if already exists)
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS duplicate_flag_type TEXT;

-- Drop any prior check constraint (old 3-value or named constraint)
ALTER TABLE linksy_tickets
  DROP CONSTRAINT IF EXISTS linksy_tickets_duplicate_flag_type_check;

-- Recreate with all four cases
ALTER TABLE linksy_tickets
  ADD CONSTRAINT linksy_tickets_duplicate_flag_type_check
    CHECK (duplicate_flag_type IN ('case_a', 'case_b', 'case_c', 'case_d'));

COMMENT ON COLUMN linksy_tickets.duplicate_flag_type IS
  'Duplicate detection flag: case_a=5+ providers same service same day, case_b=same provider+service within 30 days (blocked), case_c=consecutive day same provider, case_d=same service category same week';

-- Indexes for duplicate detection
CREATE INDEX IF NOT EXISTS idx_linksy_tickets_duplicate_flag
  ON linksy_tickets (duplicate_flag_type)
  WHERE duplicate_flag_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_provider_date
  ON linksy_tickets (client_email, provider_id, created_at DESC)
  WHERE client_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_phone_provider_date
  ON linksy_tickets (client_phone, provider_id, created_at DESC)
  WHERE client_phone IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) SLA REMINDER SYSTEM  (from 20260322000002)
--    Depends on linksy_referral_alert_config created in section 2 above.
-- ─────────────────────────────────────────────────────────────────────────────

-- Provider SLA config columns
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS sla_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS sla_reminder_hours integer NOT NULL DEFAULT 48;

COMMENT ON COLUMN linksy_providers.sla_hours IS 'SLA deadline in hours from ticket creation (default 24 = 1 day)';
COMMENT ON COLUMN linksy_providers.sla_reminder_hours IS 'Hours after ticket creation to send SLA reminder email (default 48 = 2 days)';

-- Ticket reminder tracking
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS sla_reminder_sent_at timestamptz;

COMMENT ON COLUMN linksy_tickets.sla_reminder_sent_at IS 'Timestamp when the SLA reminder email was sent for this ticket';

-- Master switch on alert config table
ALTER TABLE linksy_referral_alert_config
  ADD COLUMN IF NOT EXISTS sla_reminder_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN linksy_referral_alert_config.sla_reminder_enabled IS 'Master switch for per-provider SLA reminder emails (disabled by default)';

-- SLA trigger function (CREATE OR REPLACE is safe to re-run)
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

-- Backfill providers with defaults
UPDATE linksy_providers
  SET sla_hours = 24, sla_reminder_hours = 48
  WHERE sla_hours IS NULL OR sla_reminder_hours IS NULL;

-- Backfill sla_due_at for pending tickets using provider SLA hours
UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.status = 'pending'
    AND t.sla_due_at IS NOT NULL;

-- Backfill tickets missing sla_due_at entirely
UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.sla_due_at IS NULL;

-- Tickets without a provider get 24h default
UPDATE linksy_tickets
  SET sla_due_at = created_at + interval '24 hours'
  WHERE sla_due_at IS NULL AND provider_id IS NULL;

COMMIT;
