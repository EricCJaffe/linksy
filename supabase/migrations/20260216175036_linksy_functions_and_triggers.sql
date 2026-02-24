
-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Semantic search for needs
CREATE OR REPLACE FUNCTION linksy_search_needs(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, name TEXT, category_name TEXT, synonyms TEXT[], similarity FLOAT)
LANGUAGE sql STABLE
AS $$
  SELECT n.id, n.name, nc.name AS category_name, n.synonyms,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM linksy_needs n
  JOIN linksy_need_categories nc ON nc.id = n.category_id
  WHERE n.is_active = true AND n.embedding IS NOT NULL
    AND (p_site_id IS NULL OR n.site_id = p_site_id)
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Proximity search returning LLM context cards
CREATE OR REPLACE FUNCTION linksy_search_providers_nearby(
  p_latitude FLOAT, p_longitude FLOAT,
  p_radius_miles INTEGER DEFAULT 25,
  p_need_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (provider_id UUID, provider_name TEXT, distance_miles FLOAT, llm_context_card TEXT, needs TEXT[])
LANGUAGE sql STABLE
AS $$
  SELECT p.id, p.name,
    ST_Distance(l.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) / 1609.34 AS distance_miles,
    p.llm_context_card,
    ARRAY_AGG(DISTINCT n.name) FILTER (WHERE n.name IS NOT NULL) AS needs
  FROM linksy_providers p
  JOIN linksy_locations l ON l.provider_id = p.id AND l.is_active = true
  LEFT JOIN linksy_provider_needs pn ON pn.provider_id = p.id
  LEFT JOIN linksy_needs n ON n.id = pn.need_id
  WHERE p.is_active = true
    AND (p_site_id IS NULL OR p.site_id = p_site_id)
    AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_miles * 1609.34)
    AND (p_need_id IS NULL OR pn.need_id = p_need_id)
  GROUP BY p.id, p.name, l.location, p.llm_context_card
  ORDER BY distance_miles
  LIMIT p_limit;
$$;

-- Generate LLM context card for a provider
CREATE OR REPLACE FUNCTION linksy_generate_context_card(p_provider_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_provider RECORD;
  v_location RECORD;
  v_needs TEXT[];
  v_card TEXT;
BEGIN
  SELECT * INTO v_provider FROM linksy_providers WHERE id = p_provider_id;
  SELECT * INTO v_location FROM linksy_locations WHERE provider_id = p_provider_id AND is_primary = true LIMIT 1;
  SELECT ARRAY_AGG(n.name ORDER BY n.name) INTO v_needs
    FROM linksy_provider_needs pn JOIN linksy_needs n ON n.id = pn.need_id WHERE pn.provider_id = p_provider_id;

  v_card := '## ' || v_provider.name || E'\n';
  IF v_provider.description IS NOT NULL THEN v_card := v_card || v_provider.description || E'\n\n'; END IF;
  IF v_provider.phone IS NOT NULL THEN v_card := v_card || '**Phone:** ' || v_provider.phone || E'\n'; END IF;
  IF v_provider.email IS NOT NULL THEN v_card := v_card || '**Email:** ' || v_provider.email || E'\n'; END IF;
  IF v_provider.hours_of_operation IS NOT NULL THEN v_card := v_card || '**Hours:** ' || v_provider.hours_of_operation || E'\n'; END IF;
  IF v_location IS NOT NULL AND v_location.address_line1 IS NOT NULL THEN
    v_card := v_card || '**Address:** ' || v_location.address_line1;
    IF v_location.city IS NOT NULL THEN v_card := v_card || ', ' || v_location.city; END IF;
    IF v_location.state IS NOT NULL THEN v_card := v_card || ', ' || v_location.state; END IF;
    IF v_location.postal_code IS NOT NULL THEN v_card := v_card || ' ' || v_location.postal_code; END IF;
    v_card := v_card || E'\n';
  END IF;
  IF v_provider.website IS NOT NULL THEN v_card := v_card || '**Website:** ' || v_provider.website || E'\n'; END IF;
  IF v_needs IS NOT NULL AND array_length(v_needs, 1) > 0 THEN
    v_card := v_card || '**Services:** ' || array_to_string(v_needs, ', ') || E'\n';
  END IF;
  IF v_provider.referral_type = 'contact_directly' THEN
    v_card := v_card || '**Note:** Contact this organization directly' || E'\n';
    IF v_provider.referral_instructions IS NOT NULL THEN v_card := v_card || v_provider.referral_instructions || E'\n'; END IF;
  END IF;
  RETURN v_card;
END;
$$;

-- Crisis keyword check
CREATE OR REPLACE FUNCTION linksy_check_crisis(p_message TEXT, p_site_id UUID)
RETURNS TABLE (crisis_type TEXT, severity TEXT, response_template TEXT, emergency_resources JSONB, matched_keyword TEXT)
LANGUAGE sql STABLE AS $$
  SELECT ck.crisis_type, ck.severity, ck.response_template, ck.emergency_resources, ck.keyword
  FROM linksy_crisis_keywords ck
  WHERE ck.site_id = p_site_id AND ck.is_active = true
    AND p_message ILIKE '%' || ck.keyword || '%'
  ORDER BY CASE ck.severity WHEN 'high' THEN 1 ELSE 2 END
  LIMIT 1;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION linksy_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_linksy_providers_updated BEFORE UPDATE ON linksy_providers FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_locations_updated BEFORE UPDATE ON linksy_locations FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_need_categories_updated BEFORE UPDATE ON linksy_need_categories FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_needs_updated BEFORE UPDATE ON linksy_needs FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_tickets_updated BEFORE UPDATE ON linksy_tickets FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_events_updated BEFORE UPDATE ON linksy_events FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();

-- Auto-regenerate LLM context card on provider changes
CREATE OR REPLACE FUNCTION linksy_refresh_context_card()
RETURNS TRIGGER AS $$
BEGIN
  NEW.llm_context_card := linksy_generate_context_card(NEW.id);
  NEW.llm_context_card_generated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_linksy_providers_context_card
  BEFORE INSERT OR UPDATE OF name, description, phone, email, website, hours_of_operation, referral_type, referral_instructions
  ON linksy_providers
  FOR EACH ROW EXECUTE FUNCTION linksy_refresh_context_card();
;
