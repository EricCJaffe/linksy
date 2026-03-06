-- TASK-029: Add duplicate referral flag column
-- Tracks referrals flagged by duplicate detection (Case A: multi-provider, Case C: consecutive day)

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS duplicate_flag_type TEXT
    CHECK (duplicate_flag_type IN ('case_a', 'case_b', 'case_c'));

COMMENT ON COLUMN linksy_tickets.duplicate_flag_type IS 'Duplicate detection flag: case_a=5+ providers same service same day, case_b=same provider+service same day (blocked), case_c=consecutive day same provider';

-- Index for admin potential duplicates report
CREATE INDEX IF NOT EXISTS idx_linksy_tickets_duplicate_flag
  ON linksy_tickets (duplicate_flag_type)
  WHERE duplicate_flag_type IS NOT NULL;

-- Performance index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_provider_date
  ON linksy_tickets (client_email, provider_id, created_at DESC)
  WHERE client_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_phone_provider_date
  ON linksy_tickets (client_phone, provider_id, created_at DESC)
  WHERE client_phone IS NOT NULL;
