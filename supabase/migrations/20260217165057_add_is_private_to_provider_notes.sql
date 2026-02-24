ALTER TABLE public.linksy_provider_notes
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;;
