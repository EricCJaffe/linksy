-- Restore custom_data on linksy_tickets (used by widget intake forms)

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN linksy_tickets.custom_data IS 'Custom field responses from host intake form (key-value pairs)';

CREATE INDEX IF NOT EXISTS idx_tickets_custom_data
ON linksy_tickets USING GIN (custom_data);
