-- Add email and full_name to provider contacts for invited users
-- These fields store contact info temporarily until the user account is created

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_provider_contacts_email
ON linksy_provider_contacts(email)
WHERE email IS NOT NULL;

-- Add constraint: must have either user_id OR email
ALTER TABLE linksy_provider_contacts
DROP CONSTRAINT IF EXISTS provider_contacts_user_or_email;

ALTER TABLE linksy_provider_contacts
ADD CONSTRAINT provider_contacts_user_or_email
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Backfill email and full_name from existing user records
UPDATE linksy_provider_contacts pc
SET
  email = u.email,
  full_name = u.full_name
FROM users u
WHERE pc.user_id = u.id
  AND pc.email IS NULL;

COMMENT ON COLUMN linksy_provider_contacts.email IS 'Email address for invited contacts without user accounts yet. Cleared when user_id is set.';
COMMENT ON COLUMN linksy_provider_contacts.full_name IS 'Full name for invited contacts without user accounts yet. Cleared when user_id is set.';
