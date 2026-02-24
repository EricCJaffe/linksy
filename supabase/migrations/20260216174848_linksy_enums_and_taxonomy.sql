
-- ============================================================================
-- LINKSY ENUMS
-- ============================================================================
CREATE TYPE linksy_sector AS ENUM ('nonprofit', 'faith_based', 'government', 'business');
CREATE TYPE linksy_project_status AS ENUM ('active', 'sustaining', 'maintenance', 'na');
CREATE TYPE linksy_referral_type AS ENUM ('standard', 'contact_directly');
CREATE TYPE linksy_ticket_status AS ENUM ('pending', 'customer_need_addressed', 'wrong_organization_referred', 'outside_of_scope', 'client_not_eligible', 'unable_to_assist', 'client_unresponsive');
CREATE TYPE linksy_contact_type AS ENUM ('customer', 'provider_employee');
CREATE TYPE linksy_event_status AS ENUM ('draft', 'pending_approval', 'published', 'cancelled');
CREATE TYPE linksy_note_type AS ENUM ('general', 'outreach', 'update', 'internal');

-- ============================================================================
-- NEED CATEGORIES
-- ============================================================================
CREATE TABLE linksy_need_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  airs_code TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);
CREATE INDEX idx_linksy_need_categories_site ON linksy_need_categories(site_id);
ALTER TABLE linksy_need_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "need_categories_public_read" ON linksy_need_categories FOR SELECT USING (is_active = true);
CREATE POLICY "need_categories_admin_write" ON linksy_need_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- NEEDS
-- ============================================================================
CREATE TABLE linksy_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES linksy_need_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  synonyms TEXT[],
  is_active BOOLEAN DEFAULT true,
  embedding vector(1536),
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_generated_at TIMESTAMPTZ,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);
CREATE INDEX idx_linksy_needs_site ON linksy_needs(site_id);
CREATE INDEX idx_linksy_needs_category ON linksy_needs(category_id);
CREATE INDEX idx_linksy_needs_name_trgm ON linksy_needs USING gin (name gin_trgm_ops);
ALTER TABLE linksy_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "needs_public_read" ON linksy_needs FOR SELECT USING (is_active = true);
CREATE POLICY "needs_admin_write" ON linksy_needs FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;
