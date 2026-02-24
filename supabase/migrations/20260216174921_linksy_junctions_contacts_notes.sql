
-- ============================================================================
-- PROVIDER ↔ NEEDS (many-to-many)
-- ============================================================================
CREATE TABLE linksy_provider_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  need_id UUID NOT NULL REFERENCES linksy_needs(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'manual',
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, need_id)
);
CREATE INDEX idx_linksy_provider_needs_provider ON linksy_provider_needs(provider_id);
CREATE INDEX idx_linksy_provider_needs_need ON linksy_provider_needs(need_id);
CREATE INDEX idx_linksy_provider_needs_unconfirmed ON linksy_provider_needs(is_confirmed) WHERE is_confirmed = false;
ALTER TABLE linksy_provider_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_needs_public_read" ON linksy_provider_needs FOR SELECT USING (true);
CREATE POLICY "provider_needs_admin_write" ON linksy_provider_needs FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- PROVIDER CONTACTS (links auth users to provider orgs)
-- ============================================================================
CREATE TABLE linksy_provider_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_type linksy_contact_type NOT NULL DEFAULT 'provider_employee',
  is_primary_contact BOOLEAN DEFAULT false,
  job_title TEXT,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, user_id)
);
CREATE INDEX idx_linksy_provider_contacts_provider ON linksy_provider_contacts(provider_id);
CREATE INDEX idx_linksy_provider_contacts_user ON linksy_provider_contacts(user_id);
ALTER TABLE linksy_provider_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_contacts_self_read" ON linksy_provider_contacts FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "provider_contacts_admin_all" ON linksy_provider_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- PROVIDER NOTES / TIMELINE
-- ============================================================================
CREATE TABLE linksy_provider_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  note_type linksy_note_type DEFAULT 'general',
  content TEXT NOT NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_provider_notes_provider ON linksy_provider_notes(provider_id);
CREATE INDEX idx_linksy_provider_notes_created ON linksy_provider_notes(created_at DESC);
ALTER TABLE linksy_provider_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_notes_read" ON linksy_provider_notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin')
    OR EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_provider_notes.provider_id AND pc.user_id = auth.uid())
  );
CREATE POLICY "provider_notes_insert" ON linksy_provider_notes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin')
    OR EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_provider_notes.provider_id AND pc.user_id = auth.uid())
  );
;
