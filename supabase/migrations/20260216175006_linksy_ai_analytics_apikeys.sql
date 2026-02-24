
-- ============================================================================
-- SEARCH SESSIONS (AI chatbot conversations)
-- ============================================================================
CREATE TABLE linksy_search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  api_key_id UUID,
  user_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  initial_query TEXT,
  zip_code_searched TEXT,
  user_location GEOGRAPHY(POINT, 4326),
  search_radius_miles INTEGER DEFAULT 25,
  conversation_history JSONB,
  inferred_needs TEXT[],
  total_tokens_used INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  model_used TEXT,
  created_ticket BOOLEAN DEFAULT false,
  ticket_id UUID REFERENCES linksy_tickets(id),
  crisis_detected BOOLEAN DEFAULT false,
  crisis_type TEXT,
  services_viewed UUID[],
  services_clicked UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_linksy_sessions_site ON linksy_search_sessions(site_id);
CREATE INDEX idx_linksy_sessions_created ON linksy_search_sessions(created_at DESC);
CREATE INDEX idx_linksy_sessions_crisis ON linksy_search_sessions(crisis_detected) WHERE crisis_detected = true;
ALTER TABLE linksy_search_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_admin_read" ON linksy_search_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
CREATE POLICY "sessions_anon_insert" ON linksy_search_sessions FOR INSERT WITH CHECK (true);

-- ============================================================================
-- CRISIS KEYWORDS
-- ============================================================================
CREATE TABLE linksy_crisis_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  crisis_type TEXT NOT NULL,
  severity TEXT DEFAULT 'high',
  response_template TEXT,
  emergency_resources JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_crisis_site ON linksy_crisis_keywords(site_id, is_active);
CREATE INDEX idx_linksy_crisis_keyword ON linksy_crisis_keywords USING gin (keyword gin_trgm_ops);
ALTER TABLE linksy_crisis_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crisis_admin_manage" ON linksy_crisis_keywords FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- LINKSY API KEYS (widget auth & billing - separate from base api_keys)
-- ============================================================================
CREATE TABLE linksy_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id),
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_status TEXT DEFAULT 'active',
  rate_limit_per_hour INTEGER DEFAULT 100,
  monthly_query_limit INTEGER,
  queries_this_month INTEGER DEFAULT 0,
  allowed_domains TEXT[],
  widget_config JSONB DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_linksy_api_keys_prefix ON linksy_api_keys(key_prefix);
CREATE INDEX idx_linksy_api_keys_site ON linksy_api_keys(site_id);
CREATE INDEX idx_linksy_api_keys_active ON linksy_api_keys(is_active) WHERE is_active = true;
ALTER TABLE linksy_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linksy_api_keys_admin_manage" ON linksy_api_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- AI PROMPTS (versioned prompt management)
-- ============================================================================
CREATE TABLE linksy_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  model_name TEXT DEFAULT 'claude-sonnet-4',
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT false,
  performance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(site_id, prompt_type, version)
);
CREATE INDEX idx_linksy_ai_prompts_active ON linksy_ai_prompts(site_id, prompt_type, is_active) WHERE is_active = true;
ALTER TABLE linksy_ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompts_admin_manage" ON linksy_ai_prompts FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- INTERACTIONS (analytics)
-- ============================================================================
CREATE TABLE linksy_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES linksy_search_sessions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id) ON DELETE CASCADE,
  need_id UUID REFERENCES linksy_needs(id),
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_interactions_session ON linksy_interactions(session_id);
CREATE INDEX idx_linksy_interactions_provider ON linksy_interactions(provider_id);
CREATE INDEX idx_linksy_interactions_created ON linksy_interactions(created_at DESC);
ALTER TABLE linksy_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interactions_anon_insert" ON linksy_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "interactions_admin_read" ON linksy_interactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;
