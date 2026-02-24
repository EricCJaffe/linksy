-- Add phone extension field to providers
-- This allows providers to specify an extension for their main phone number (e.g., "x123" or "ext. 456")

ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_providers.phone_extension IS 'Phone extension for the main phone number (e.g., "x123", "ext. 456")';
