-- Add pin support for provider notes
ALTER TABLE IF EXISTS linksy_provider_notes
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF to_regclass('public.linksy_provider_notes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_is_pinned
      ON linksy_provider_notes(provider_id, is_pinned, created_at DESC);
  END IF;
END $$;
