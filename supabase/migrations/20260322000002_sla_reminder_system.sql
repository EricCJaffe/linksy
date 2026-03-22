-- SLA Reminder System
-- Adds per-provider SLA configuration, ticket reminder tracking, and master switch

-- 1. Add SLA configuration columns to providers
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS sla_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS sla_reminder_hours integer NOT NULL DEFAULT 48;

COMMENT ON COLUMN linksy_providers.sla_hours IS 'SLA deadline in hours from ticket creation (default 24 = 1 day)';
COMMENT ON COLUMN linksy_providers.sla_reminder_hours IS 'Hours after ticket creation to send SLA reminder email (default 48 = 2 days)';

-- 2. Add reminder tracking to tickets
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS sla_reminder_sent_at timestamptz;

COMMENT ON COLUMN linksy_tickets.sla_reminder_sent_at IS 'Timestamp when the SLA reminder email was sent for this ticket';

-- 3. Add master switch for SLA reminders to referral_alert_config
ALTER TABLE linksy_referral_alert_config
  ADD COLUMN IF NOT EXISTS sla_reminder_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN linksy_referral_alert_config.sla_reminder_enabled IS 'Master switch for per-provider SLA reminder emails (disabled by default)';

-- 4. Update the SLA trigger to use provider-specific sla_hours
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

-- 5. Backfill existing providers with defaults (no-op if columns already have defaults)
UPDATE linksy_providers
  SET sla_hours = 24, sla_reminder_hours = 48
  WHERE sla_hours IS NULL OR sla_reminder_hours IS NULL;

-- 6. Backfill sla_due_at for existing pending tickets using provider's SLA hours
-- (Updates tickets that still have the old 48h default to use provider's actual sla_hours)
UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.status = 'pending'
    AND t.sla_due_at IS NOT NULL;

-- Also backfill tickets without sla_due_at
UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.sla_due_at IS NULL;

-- Tickets without a provider get the global default
UPDATE linksy_tickets
  SET sla_due_at = created_at + interval '24 hours'
  WHERE sla_due_at IS NULL AND provider_id IS NULL;
