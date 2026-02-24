-- Add service ZIP codes field to providers
-- Allows providers to specify which ZIP codes they serve
-- NULL or empty array means they serve all areas ("any")

ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS service_zip_codes TEXT[];

COMMENT ON COLUMN linksy_providers.service_zip_codes IS 'ZIP codes this provider serves. NULL/empty = serves all areas. Example: {''32003'', ''32065'', ''32073''}';

-- Create index for faster ZIP code lookups
CREATE INDEX IF NOT EXISTS idx_linksy_providers_service_zip_codes
ON linksy_providers USING GIN (service_zip_codes);
