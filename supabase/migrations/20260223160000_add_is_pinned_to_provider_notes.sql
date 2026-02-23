-- Add pin support for provider notes
ALTER TABLE IF EXISTS linksy_provider_notes
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_is_pinned
  ON linksy_provider_notes(provider_id, is_pinned, created_at DESC);
