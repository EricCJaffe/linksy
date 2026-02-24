
-- Add sla_due_at column to tickets
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;

-- Backfill sla_due_at for existing tickets (created_at + 48 hours)
UPDATE linksy_tickets SET sla_due_at = created_at + interval '48 hours' WHERE sla_due_at IS NULL;

-- Create trigger to auto-set sla_due_at on insert
CREATE OR REPLACE FUNCTION linksy_set_sla_due_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := NEW.created_at + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_linksy_set_sla_due_at ON linksy_tickets;
CREATE TRIGGER trg_linksy_set_sla_due_at
  BEFORE INSERT ON linksy_tickets
  FOR EACH ROW EXECUTE FUNCTION linksy_set_sla_due_at();
;
