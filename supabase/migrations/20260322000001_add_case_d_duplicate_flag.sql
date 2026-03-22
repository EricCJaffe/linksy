-- Add case_d (same service category in same week) to duplicate_flag_type check constraint.
-- Also extends Case B semantics from same-day to 30-day window (application-level change).

-- Drop and recreate the check constraint to include 'case_d'
ALTER TABLE linksy_tickets
  DROP CONSTRAINT IF EXISTS linksy_tickets_duplicate_flag_type_check;

ALTER TABLE linksy_tickets
  ADD CONSTRAINT linksy_tickets_duplicate_flag_type_check
    CHECK (duplicate_flag_type IN ('case_a', 'case_b', 'case_c', 'case_d'));

COMMENT ON COLUMN linksy_tickets.duplicate_flag_type IS
  'Duplicate detection flag: case_a=5+ providers same service same day, case_b=same provider+service within 30 days (blocked), case_c=consecutive day same provider, case_d=same service category same week';
