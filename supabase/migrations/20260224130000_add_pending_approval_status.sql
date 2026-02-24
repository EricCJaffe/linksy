-- Add import approval tracking columns
-- provider_status is TEXT so we can use 'pending_approval' as a new value without altering an enum

ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS import_source TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN linksy_providers.imported_at IS 'When this provider was imported (if applicable)';
COMMENT ON COLUMN linksy_providers.import_source IS 'Source of import: legacy_csv, api, manual, etc.';
COMMENT ON COLUMN linksy_providers.reviewed_by IS 'Admin who approved/rejected this imported provider';
COMMENT ON COLUMN linksy_providers.reviewed_at IS 'When the import was reviewed';

-- Create index for pending approval queries
CREATE INDEX IF NOT EXISTS idx_linksy_providers_pending_approval
ON linksy_providers(provider_status, imported_at DESC)
WHERE provider_status = 'pending_approval';
