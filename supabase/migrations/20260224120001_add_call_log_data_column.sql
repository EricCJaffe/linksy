-- Add structured call log data column
-- This stores call-specific metadata like duration, outcome, caller info, etc.
ALTER TABLE linksy_provider_notes
ADD COLUMN IF NOT EXISTS call_log_data JSONB;

COMMENT ON COLUMN linksy_provider_notes.call_log_data IS 'Structured call log data: { duration_minutes, call_outcome, caller_name, caller_phone, caller_email, follow_up_required, follow_up_date }';

-- Create index for querying call logs
CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_call_log
ON linksy_provider_notes(provider_id, note_type, created_at DESC)
WHERE note_type = 'call_log';
