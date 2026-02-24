
CREATE OR REPLACE FUNCTION public.linksy_add_service_clicked(
  p_session_id uuid,
  p_provider_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.linksy_search_sessions
  SET services_clicked = array_append(
    COALESCE(services_clicked, ARRAY[]::uuid[]),
    p_provider_id
  )
  WHERE id = p_session_id
    AND NOT (COALESCE(services_clicked, ARRAY[]::uuid[]) @> ARRAY[p_provider_id]);
$$;
;
