ALTER TABLE linksy_provider_notes
  ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;;
