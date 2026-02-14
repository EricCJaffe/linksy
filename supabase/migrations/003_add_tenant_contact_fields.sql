-- Add contact and address fields to tenants table

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS track_location BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for primary contact lookups
CREATE INDEX IF NOT EXISTS idx_tenants_primary_contact ON tenants(primary_contact_id);

-- Add comment
COMMENT ON COLUMN tenants.track_location IS 'Whether to enable location tracking features for this tenant';
COMMENT ON COLUMN tenants.primary_contact_id IS 'The main contact person for this tenant organization';
