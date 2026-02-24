
-- Add provider_status column (active, paused, inactive)
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS provider_status text NOT NULL DEFAULT 'active'
  CHECK (provider_status IN ('active', 'paused', 'inactive'));

-- Migrate existing is_active boolean to provider_status
UPDATE linksy_providers SET provider_status = 'active' WHERE is_active = true;
UPDATE linksy_providers SET provider_status = 'inactive' WHERE is_active = false;

-- Add accepting_referrals boolean
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS accepting_referrals boolean NOT NULL DEFAULT true;
;
