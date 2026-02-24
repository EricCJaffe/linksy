-- ============================================================================
-- STEP 1: Add email and full_name columns to linksy_provider_contacts
-- ============================================================================

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- ============================================================================
-- STEP 2: Identify contacts that need email addresses
-- Run this to see which contacts will cause problems
-- ============================================================================

SELECT
  id,
  provider_id,
  user_id,
  job_title,
  phone,
  status,
  created_at
FROM linksy_provider_contacts
WHERE user_id IS NULL
  AND (email IS NULL OR email = '');

-- ============================================================================
-- STEP 3: Fix invalid contacts
-- Choose ONE of these options based on what Step 2 showed you:
-- ============================================================================

-- OPTION A: Delete invalid records (if they're test data or orphaned)
-- Uncomment the line below to delete:
-- DELETE FROM linksy_provider_contacts WHERE user_id IS NULL AND (email IS NULL OR email = '');

-- OPTION B: Add placeholder emails (if you want to preserve the records)
-- Uncomment the line below to add placeholders:
-- UPDATE linksy_provider_contacts SET email = CONCAT('placeholder-', id::text, '@example.com') WHERE user_id IS NULL AND (email IS NULL OR email = '');

-- ============================================================================
-- STEP 4: Verify cleanup (should return 0)
-- ============================================================================

SELECT COUNT(*) as invalid_contacts
FROM linksy_provider_contacts
WHERE user_id IS NULL
  AND (email IS NULL OR email = '');

-- ============================================================================
-- STEP 5: Add the constraint (only after Step 4 returns 0)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_contacts_user_or_email'
  ) THEN
    ALTER TABLE linksy_provider_contacts
    ADD CONSTRAINT provider_contacts_user_or_email
    CHECK (user_id IS NOT NULL OR email IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Add index for email lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_provider_contacts_email
ON linksy_provider_contacts(email)
WHERE email IS NOT NULL;

-- ============================================================================
-- STEP 7: Add comments
-- ============================================================================

COMMENT ON COLUMN linksy_provider_contacts.email IS 'Temporary email storage for invited contacts (NULL once user_id is set)';
COMMENT ON COLUMN linksy_provider_contacts.full_name IS 'Temporary full_name storage for invited contacts (NULL once user_id is set)';

-- ============================================================================
-- STEP 8: Create auto-linking trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email since we now have user_id
      full_name = NULL  -- Clear temporary full_name since we now have user_id
    WHERE id = v_contact_id
      AND user_id IS NULL;  -- Only update if not already linked

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email
      full_name = NULL  -- Clear temporary full_name
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status = 'invited';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: Create trigger
-- ============================================================================

DROP TRIGGER IF EXISTS link_invited_user_trigger ON public.users;

CREATE TRIGGER link_invited_user_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION link_invited_user_to_contact();

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record when they sign up';

-- ============================================================================
-- VERIFICATION: Run this at the end to confirm everything worked
-- ============================================================================

-- Check constraint exists
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'provider_contacts_user_or_email';

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'link_invited_user_trigger';

-- Check all contacts are valid
SELECT
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user,
  COUNT(*) FILTER (WHERE user_id IS NULL AND email IS NOT NULL) as invited_pending
FROM linksy_provider_contacts;
