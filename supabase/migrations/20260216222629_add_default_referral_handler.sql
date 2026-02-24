-- Add default referral handler flag to provider contacts
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS is_default_referral_handler BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_provider_contacts_default_handler
ON linksy_provider_contacts(provider_id, is_default_referral_handler)
WHERE is_default_referral_handler = true;

-- Ensure only one default handler per provider
-- This is a constraint function that will be triggered before insert/update
CREATE OR REPLACE FUNCTION enforce_single_default_referral_handler()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this contact as default, unset all others for this provider
  IF NEW.is_default_referral_handler = true THEN
    UPDATE linksy_provider_contacts
    SET is_default_referral_handler = false
    WHERE provider_id = NEW.provider_id
      AND id != NEW.id
      AND is_default_referral_handler = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_default_referral_handler_trigger ON linksy_provider_contacts;

CREATE TRIGGER enforce_single_default_referral_handler_trigger
BEFORE INSERT OR UPDATE ON linksy_provider_contacts
FOR EACH ROW
EXECUTE FUNCTION enforce_single_default_referral_handler();

-- Set the primary contact as default handler for each provider (if they have one)
UPDATE linksy_provider_contacts pc1
SET is_default_referral_handler = true
WHERE is_primary_contact = true
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_contacts pc2
    WHERE pc2.provider_id = pc1.provider_id
      AND pc2.is_default_referral_handler = true
  );

-- For providers without a primary contact, set the first contact as default
UPDATE linksy_provider_contacts pc1
SET is_default_referral_handler = true
WHERE id IN (
  SELECT DISTINCT ON (provider_id) id
  FROM linksy_provider_contacts
  WHERE provider_id IN (
    -- Providers without any default handler yet
    SELECT DISTINCT provider_id
    FROM linksy_provider_contacts pc2
    WHERE NOT EXISTS (
      SELECT 1 FROM linksy_provider_contacts pc3
      WHERE pc3.provider_id = pc2.provider_id
        AND pc3.is_default_referral_handler = true
    )
  )
  ORDER BY provider_id, created_at ASC
);;
