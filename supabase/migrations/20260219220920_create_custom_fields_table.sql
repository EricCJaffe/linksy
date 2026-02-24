
-- Dynamic intake form custom fields per provider
CREATE TABLE IF NOT EXISTS linksy_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'select', 'checkbox', 'date')),
  options jsonb DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_provider ON linksy_custom_fields(provider_id);

-- Enable RLS
ALTER TABLE linksy_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage custom fields" ON linksy_custom_fields
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
;
