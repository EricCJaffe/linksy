-- TASK-020: Call log + notes on Provider Contact page
-- Add contact_id to allow per-contact notes

ALTER TABLE linksy_provider_notes
  ADD COLUMN IF NOT EXISTS contact_id UUID DEFAULT NULL
  REFERENCES linksy_provider_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_contact_id
  ON linksy_provider_notes(contact_id)
  WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN linksy_provider_notes.contact_id IS 'Optional: links note to a specific contact';
