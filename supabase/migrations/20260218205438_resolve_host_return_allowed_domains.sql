DROP FUNCTION IF EXISTS public.linksy_resolve_host(text);

CREATE FUNCTION public.linksy_resolve_host(p_slug text)
 RETURNS TABLE(provider_id uuid, provider_name text, widget_config jsonb, over_budget boolean, allowed_domains text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    p.host_widget_config,
    CASE
      WHEN p.host_monthly_token_budget IS NOT NULL
        AND p.host_tokens_used_this_month >= p.host_monthly_token_budget
      THEN true ELSE false
    END AS over_budget,
    p.host_allowed_domains
  FROM public.linksy_providers p
  WHERE p.slug = p_slug
    AND p.is_host = true
    AND p.is_active = true
    AND p.host_embed_active = true
  LIMIT 1;
$$;;
