-- Enhance provider contacts table with additional fields

-- Add phone number field
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add provider role (admin = full access, user = referral management only)
-- This is separate from contact_type which is about relationship (employee vs customer)
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS provider_role VARCHAR(20) DEFAULT 'user' CHECK (provider_role IN ('admin', 'user'));

-- Add status for archiving contacts
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'invited'));

-- Add invitation tracking
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ;

-- Allow user_id to be nullable (for contacts without login)
ALTER TABLE linksy_provider_contacts
ALTER COLUMN user_id DROP NOT NULL;

-- Create index for active contacts
CREATE INDEX IF NOT EXISTS idx_provider_contacts_status
ON linksy_provider_contacts(provider_id, status)
WHERE status = 'active';

-- Ensure at least one active admin per provider
CREATE OR REPLACE FUNCTION ensure_provider_has_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- If trying to remove the last admin, prevent it
  IF (TG_OP = 'UPDATE' AND OLD.provider_role = 'admin' AND NEW.provider_role != 'admin') OR
     (TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' AND OLD.provider_role = 'admin') OR
     (TG_OP = 'DELETE' AND OLD.provider_role = 'admin' AND OLD.status = 'active') THEN

    SELECT COUNT(*) INTO admin_count
    FROM linksy_provider_contacts
    WHERE provider_id = OLD.provider_id
      AND provider_role = 'admin'
      AND status = 'active'
      AND id != OLD.id;

    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last active admin for this provider';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_provider_admin_trigger ON linksy_provider_contacts;

CREATE TRIGGER ensure_provider_admin_trigger
BEFORE UPDATE OR DELETE ON linksy_provider_contacts
FOR EACH ROW
EXECUTE FUNCTION ensure_provider_has_admin();

-- Update existing contacts to have proper defaults
UPDATE linksy_provider_contacts
SET
  provider_role = CASE
    WHEN is_primary_contact = true THEN 'admin'
    ELSE 'user'
  END,
  status = 'active'
WHERE provider_role IS NULL OR status IS NULL;

-- Mark contacts with user_id as having accepted invitation
UPDATE linksy_provider_contacts
SET invitation_accepted_at = created_at
WHERE user_id IS NOT NULL AND invitation_accepted_at IS NULL;;
