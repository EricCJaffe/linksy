-- RPC function to find upcoming published events for matched providers.
-- Events are matched via the provider_needs junction: if a provider serves
-- a matching need, its future published events are returned.

CREATE OR REPLACE FUNCTION linksy_search_events_by_providers(
  p_provider_ids UUID[],
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  recurrence_rule TEXT,
  provider_id UUID,
  provider_name TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.recurrence_rule,
    e.provider_id,
    p.name AS provider_name
  FROM linksy_provider_events e
  JOIN linksy_providers p ON p.id = e.provider_id
  WHERE e.provider_id = ANY(p_provider_ids)
    AND e.status = 'approved'
    AND e.is_public = true
    AND e.event_date > now()
  ORDER BY e.event_date ASC
  LIMIT p_limit;
$$;
