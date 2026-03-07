-- TASK-008: Provider source tagging
-- TASK-019: Provider freeze/hold
-- Add source and freeze columns to linksy_providers

-- Source tagging
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_other TEXT DEFAULT NULL;

COMMENT ON COLUMN linksy_providers.source IS 'Provider source: CC, UW, IW, Self-Registered, Other';
COMMENT ON COLUMN linksy_providers.source_other IS 'Free text when source is Other';

-- Freeze/hold
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frozen_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frozen_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS freeze_return_date DATE DEFAULT NULL;

COMMENT ON COLUMN linksy_providers.is_frozen IS 'Whether this provider is frozen (no new referrals)';
COMMENT ON COLUMN linksy_providers.frozen_reason IS 'Reason for freezing';
COMMENT ON COLUMN linksy_providers.frozen_at IS 'When provider was frozen';
COMMENT ON COLUMN linksy_providers.frozen_by IS 'User ID who froze the provider';
COMMENT ON COLUMN linksy_providers.freeze_return_date IS 'Expected date to unfreeze';

-- Index for filtering frozen providers
CREATE INDEX IF NOT EXISTS idx_linksy_providers_is_frozen ON linksy_providers(is_frozen) WHERE is_frozen = true;
CREATE INDEX IF NOT EXISTS idx_linksy_providers_source ON linksy_providers(source) WHERE source IS NOT NULL;
