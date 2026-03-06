-- Add is_test flag for test referral detection
-- Auto-flagged when client_name = 'Mega Coolmint' (case-insensitive)
-- Excluded from analytics by default

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering test referrals out of analytics queries
CREATE INDEX IF NOT EXISTS idx_linksy_tickets_is_test
  ON linksy_tickets (is_test) WHERE is_test = TRUE;

-- Backfill: flag existing test referrals by client name
UPDATE linksy_tickets
  SET is_test = TRUE
  WHERE LOWER(TRIM(client_name)) = 'mega coolmint'
    AND is_test = FALSE;
