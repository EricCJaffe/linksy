-- Add service category (need_id), address, and geocoordinates to provider events.
-- These fields are mandatory for new events going forward; existing rows keep NULLs.

ALTER TABLE linksy_provider_events
  ADD COLUMN IF NOT EXISTS need_id UUID REFERENCES linksy_needs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for filtering events by need (service category)
CREATE INDEX IF NOT EXISTS idx_provider_events_need_id
  ON linksy_provider_events (need_id)
  WHERE need_id IS NOT NULL;

-- Spatial index for proximity searches (events within radius)
CREATE INDEX IF NOT EXISTS idx_provider_events_lat_lng
  ON linksy_provider_events (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Replace the existing search function with one that supports:
--   1) Filtering by need IDs (service categories)
--   2) Proximity-based sorting when user location is available
--   3) Independent event search (not limited to matched provider IDs)
CREATE OR REPLACE FUNCTION linksy_search_events_by_needs(
  p_need_ids UUID[],
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_miles DOUBLE PRECISION DEFAULT 50,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  recurrence_rule TEXT,
  provider_id UUID,
  provider_name TEXT,
  need_id UUID,
  need_name TEXT,
  category_name TEXT,
  distance_miles DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.address,
    e.latitude,
    e.longitude,
    e.recurrence_rule,
    e.provider_id,
    p.name AS provider_name,
    e.need_id,
    n.name AS need_name,
    nc.name AS category_name,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      THEN ROUND(
        (ST_DistanceSphere(
          ST_MakePoint(e.longitude, e.latitude),
          ST_MakePoint(p_lng, p_lat)
        ) / 1609.34)::numeric, 1
      )::double precision
      ELSE NULL
    END AS distance_miles
  FROM linksy_provider_events e
  JOIN linksy_providers p ON p.id = e.provider_id
  LEFT JOIN linksy_needs n ON n.id = e.need_id
  LEFT JOIN linksy_need_categories nc ON nc.id = n.category_id
  WHERE e.status = 'approved'
    AND e.is_public = true
    AND e.event_date > now()
    AND (
      -- Match events tagged with any of the searched needs
      e.need_id = ANY(p_need_ids)
      -- Also include events from providers that serve those needs (legacy untagged events)
      OR (e.need_id IS NULL AND e.provider_id IN (
        SELECT pn.provider_id FROM linksy_provider_needs pn WHERE pn.need_id = ANY(p_need_ids)
      ))
    )
    AND (
      -- If location provided, filter by radius
      p_lat IS NULL OR p_lng IS NULL
      OR e.latitude IS NULL OR e.longitude IS NULL
      OR ST_DistanceSphere(
        ST_MakePoint(e.longitude, e.latitude),
        ST_MakePoint(p_lng, p_lat)
      ) <= (p_radius_miles * 1609.34)
    )
  ORDER BY
    -- Prefer events tagged with a need over untagged fallbacks
    (CASE WHEN e.need_id = ANY(p_need_ids) THEN 0 ELSE 1 END),
    -- Then by distance if available
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      THEN ST_DistanceSphere(
        ST_MakePoint(e.longitude, e.latitude),
        ST_MakePoint(p_lng, p_lat)
      )
      ELSE 0
    END,
    e.event_date ASC
  LIMIT p_limit;
$$;
