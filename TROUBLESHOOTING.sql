-- TROUBLESHOOTING: Provider Contact Access Issues
-- User: eric@foundationstoneadvisors.com (ID: 0e4fb722-df91-4fab-90d1-ccd01187fd32)
-- Provider: Impact Clay (ID: 3fc0e9d6-f82d-4f7e-8a99-0a3f4fb8aa44)

-- ========================================
-- STEP 1: Check current contact status
-- ========================================
SELECT
  id,
  provider_id,
  user_id,
  email,
  full_name,
  status,
  provider_role,
  contact_type,
  invitation_sent_at,
  invitation_accepted_at,
  created_at
FROM linksy_provider_contacts
WHERE user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid;

-- Expected: Should show status = 'invited' (PROBLEM)
-- Need: status = 'active' for access to work


-- ========================================
-- STEP 2: Apply the trigger fix (from migration 20260224230000)
-- ========================================
-- This fixes the contact linking trigger to run on auth.users
DROP TRIGGER IF EXISTS link_invited_user_trigger ON public.users;
DROP TRIGGER IF EXISTS link_invited_user_trigger ON auth.users;

CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the user's email
  v_user_email := NEW.email;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,
      full_name = NULL
    WHERE id = v_contact_id
      AND user_id IS NULL;

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,
      full_name = NULL
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status IN ('invited', 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER link_invited_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_invited_user_to_contact();

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record when they sign up. Runs on auth.users to access raw_user_meta_data.';


-- ========================================
-- STEP 3: Manually update existing contact to 'active'
-- ========================================
-- Since the user already signed up BEFORE the trigger fix, manually update
UPDATE linksy_provider_contacts
SET
  status = 'active',
  invitation_accepted_at = COALESCE(invitation_accepted_at, NOW())
WHERE user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid
  AND status = 'invited';

-- Verify the update worked
SELECT
  id,
  provider_id,
  user_id,
  status,
  provider_role,
  contact_type,
  invitation_accepted_at
FROM linksy_provider_contacts
WHERE user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid;

-- Expected: status should now be 'active'


-- ========================================
-- STEP 4: Test the access function
-- ========================================
SELECT linksy_user_can_access_provider(
  '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid,  -- user_id
  '3fc0e9d6-f82d-4f7e-8a99-0a3f4fb8aa44'::uuid   -- provider_id (Impact Clay)
);

-- Expected: Should return TRUE


-- ========================================
-- STEP 5: Check provider role and contact type
-- ========================================
-- Make sure the user has the correct role and contact_type
SELECT
  pc.id,
  pc.provider_id,
  p.name AS provider_name,
  pc.provider_role,
  pc.contact_type,
  pc.is_primary_contact,
  pc.status
FROM linksy_provider_contacts pc
JOIN linksy_providers p ON p.id = pc.provider_id
WHERE pc.user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid;

-- For full admin access, user should have:
-- provider_role = 'admin' (for internal team management)
-- contact_type = 'provider_admin' or 'org_admin' (for parent/child relationships)

-- If needed, update to admin:
-- UPDATE linksy_provider_contacts
-- SET
--   provider_role = 'admin',
--   contact_type = 'provider_admin'
-- WHERE user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid;
