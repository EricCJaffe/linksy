
-- ============================================================================
-- PROVIDERS
-- ============================================================================
CREATE TABLE linksy_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sector linksy_sector NOT NULL DEFAULT 'nonprofit',
  project_status linksy_project_status DEFAULT 'na',
  referral_type linksy_referral_type DEFAULT 'standard',
  referral_instructions TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  hours_of_operation TEXT,
  social_links JSONB DEFAULT '{}',
  llm_context_card TEXT,
  llm_context_card_generated_at TIMESTAMPTZ,
  ai_summary TEXT,
  embedding vector(1536),
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_generated_at TIMESTAMPTZ,
  search_popularity_score FLOAT DEFAULT 0,
  click_through_rate FLOAT DEFAULT 0,
  ticket_conversion_rate FLOAT DEFAULT 0,
  description_quality_score FLOAT,
  needs_human_review BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  allow_auto_update_description BOOLEAN DEFAULT false,
  legacy_id TEXT,
  legacy_referral_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);
CREATE INDEX idx_linksy_providers_site ON linksy_providers(site_id);
CREATE INDEX idx_linksy_providers_active ON linksy_providers(site_id, is_active);
CREATE INDEX idx_linksy_providers_sector ON linksy_providers(sector);
CREATE INDEX idx_linksy_providers_name_trgm ON linksy_providers USING gin (name gin_trgm_ops);
ALTER TABLE linksy_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_public_read" ON linksy_providers FOR SELECT USING (is_active = true);
CREATE POLICY "providers_admin_all" ON linksy_providers FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- LOCATIONS
-- ============================================================================
CREATE TABLE linksy_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_line3 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  county TEXT,
  country TEXT DEFAULT 'US',
  location GEOGRAPHY(POINT, 4326),
  latitude FLOAT,
  longitude FLOAT,
  geocoded_at TIMESTAMPTZ,
  geocode_source TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_locations_provider ON linksy_locations(provider_id);
CREATE INDEX idx_linksy_locations_geo ON linksy_locations USING GIST (location);
CREATE INDEX idx_linksy_locations_city ON linksy_locations(city);
CREATE INDEX idx_linksy_locations_postal ON linksy_locations(postal_code);
ALTER TABLE linksy_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_public_read" ON linksy_locations FOR SELECT USING (is_active = true);
CREATE POLICY "locations_admin_write" ON linksy_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;
