-- Add phone_extension to locations and contacts for standardized phone display
-- Format: 1-(XXX)-XXX-XXXX ext. YYYY

ALTER TABLE linksy_locations
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_locations.phone_extension
  IS 'Phone extension for the location phone number';

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_provider_contacts.phone_extension
  IS 'Phone extension for the contact phone number';

ALTER TABLE linksy_provider_applications
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_provider_applications.phone_extension
  IS 'Phone extension for the organization phone number';

ALTER TABLE linksy_provider_applications
ADD COLUMN IF NOT EXISTS contact_phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_provider_applications.contact_phone_extension
  IS 'Phone extension for the application contact phone number';
