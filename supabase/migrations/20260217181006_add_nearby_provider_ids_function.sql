
CREATE OR REPLACE FUNCTION linksy_nearby_provider_ids(
  lat  double precision,
  lng  double precision,
  radius_meters double precision
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT provider_id
  FROM public.linksy_locations
  WHERE location IS NOT NULL
    AND ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
$$;
;
