-- Add AI remediation columns for automated fix pipeline (Phase 2)
-- After triage, admin can approve → Claude API generates fix → GitHub PR created

ALTER TABLE linksy_support_tickets
  ADD COLUMN IF NOT EXISTS remediation_status TEXT NOT NULL DEFAULT 'none'
    CHECK (remediation_status IN ('none', 'approved', 'generating', 'pr_created', 'merged', 'failed')),
  ADD COLUMN IF NOT EXISTS remediation_pr_url TEXT,
  ADD COLUMN IF NOT EXISTS remediation_branch TEXT,
  ADD COLUMN IF NOT EXISTS remediation_result JSONB,
  ADD COLUMN IF NOT EXISTS remediation_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS remediation_approved_at TIMESTAMPTZ;

COMMENT ON COLUMN linksy_support_tickets.remediation_status IS
  'AI remediation pipeline: none → approved → generating → pr_created/failed → merged';
COMMENT ON COLUMN linksy_support_tickets.remediation_result IS
  'AI-generated fix details: { files_changed, commit_message, summary, model_used }';
