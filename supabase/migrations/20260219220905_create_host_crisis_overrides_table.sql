
-- Host-specific crisis keyword overrides
CREATE TABLE IF NOT EXISTS linksy_host_crisis_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  keyword_id uuid NOT NULL REFERENCES linksy_crisis_keywords(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('include', 'exclude')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(host_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_host_crisis_overrides_host ON linksy_host_crisis_overrides(host_id);

-- Add excluded_search_terms JSONB to providers (for hosts)
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS excluded_search_terms jsonb DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE linksy_host_crisis_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage crisis overrides" ON linksy_host_crisis_overrides
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
;
