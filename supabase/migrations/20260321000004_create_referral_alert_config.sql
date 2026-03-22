-- Configurable stale referral alert settings
-- Drives the daily cron that emails designated recipients when referrals stay Pending too long

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

-- RLS: site admins can read/write
ALTER TABLE linksy_referral_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_admins_manage_referral_alert_config"
  ON linksy_referral_alert_config
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
