-- Add AI triage columns to support tickets for automated analysis
-- When a support ticket is created, AI analyzes it and generates:
-- - Issue classification and severity estimate
-- - Likely affected code areas
-- - A ready-to-use remediation prompt for Claude Code
-- - Suggested fix approach

ALTER TABLE linksy_support_tickets
  ADD COLUMN IF NOT EXISTS ai_triage JSONB,
  ADD COLUMN IF NOT EXISTS ai_triage_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ai_triage_status IN ('pending', 'analyzing', 'complete', 'failed', 'skipped'));

-- Index for finding tickets needing triage
CREATE INDEX IF NOT EXISTS idx_support_tickets_triage_status
  ON linksy_support_tickets (ai_triage_status)
  WHERE ai_triage_status IN ('pending', 'analyzing');

COMMENT ON COLUMN linksy_support_tickets.ai_triage IS
  'AI-generated triage analysis: { classification, severity, affected_areas, suggested_fix, remediation_prompt, confidence }';
COMMENT ON COLUMN linksy_support_tickets.ai_triage_status IS
  'Status of AI triage: pending → analyzing → complete/failed/skipped';
