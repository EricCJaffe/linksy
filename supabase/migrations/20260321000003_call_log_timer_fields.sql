-- Add timer/duration tracking fields to call logs
-- Supports auto-timer (started_at/ended_at set in real-time) and manual entry

ALTER TABLE linksy_call_logs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- Add a check: ended_at must be after started_at when both are present
-- Drop first to make migration idempotent (safe to re-run)
ALTER TABLE linksy_call_logs
  DROP CONSTRAINT IF EXISTS call_log_time_order;
ALTER TABLE linksy_call_logs
  ADD CONSTRAINT call_log_time_order
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at);

COMMENT ON COLUMN linksy_call_logs.started_at IS 'Call start time — set automatically by timer or manually entered';
COMMENT ON COLUMN linksy_call_logs.ended_at IS 'Call end time — set automatically by timer or manually entered';
