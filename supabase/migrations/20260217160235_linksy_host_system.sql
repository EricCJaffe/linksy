
-- ============================================================
-- Host System: providers that embed the widget on their site
-- ============================================================

ALTER TABLE public.linksy_providers
  ADD COLUMN IF NOT EXISTS is_host BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_embed_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS host_widget_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS host_allowed_domains TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS host_tokens_used_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS host_searches_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS host_monthly_token_budget INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS host_usage_reset_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_providers_host_slug
  ON public.linksy_providers (slug)
  WHERE is_host = true AND is_active = true AND host_embed_active = true;

ALTER TABLE public.linksy_search_sessions
  ADD COLUMN IF NOT EXISTS host_provider_id UUID REFERENCES public.linksy_providers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_search_sessions_host
  ON public.linksy_search_sessions (host_provider_id)
  WHERE host_provider_id IS NOT NULL;

-- ============================================================
-- RPC: increment host usage counters atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.linksy_increment_host_usage(
  p_host_provider_id UUID,
  p_tokens_used INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.linksy_providers
  SET
    host_usage_reset_at          = CASE
      WHEN host_usage_reset_at IS NULL OR host_usage_reset_at < NOW() - INTERVAL '30 days'
      THEN NOW()
      ELSE host_usage_reset_at
    END,
    host_tokens_used_this_month  = CASE
      WHEN host_usage_reset_at IS NULL OR host_usage_reset_at < NOW() - INTERVAL '30 days'
      THEN p_tokens_used
      ELSE host_tokens_used_this_month + p_tokens_used
    END,
    host_searches_this_month     = CASE
      WHEN host_usage_reset_at IS NULL OR host_usage_reset_at < NOW() - INTERVAL '30 days'
      THEN 1
      ELSE host_searches_this_month + 1
    END
  WHERE id = p_host_provider_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.linksy_increment_host_usage(UUID, INTEGER) TO authenticated, anon;

-- ============================================================
-- RPC: resolve host by slug (widget page load)
-- ============================================================
CREATE OR REPLACE FUNCTION public.linksy_resolve_host(p_slug TEXT)
RETURNS TABLE (
  provider_id   UUID,
  provider_name TEXT,
  widget_config JSONB,
  over_budget   BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    p.host_widget_config,
    CASE
      WHEN p.host_monthly_token_budget IS NOT NULL
        AND p.host_tokens_used_this_month >= p.host_monthly_token_budget
      THEN true ELSE false
    END AS over_budget
  FROM public.linksy_providers p
  WHERE p.slug = p_slug
    AND p.is_host = true
    AND p.is_active = true
    AND p.host_embed_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.linksy_resolve_host(TEXT) TO anon, authenticated;
;
