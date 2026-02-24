-- ============================================
-- FIX PROVIDER ACCESS FOR eric@foundationstoneadvisors.com
-- ============================================

-- STEP 1: Check current status
SELECT
  'CURRENT STATUS CHECK' as step,
  pc.id,
  pc.provider_id,
  p.name AS provider_name,
  pc.user_id,
  pc.email,
  pc.status,
  pc.provider_role,
  pc.contact_type,
  pc.invitation_sent_at,
  pc.invitation_accepted_at
FROM linksy_provider_contacts pc
LEFT JOIN linksy_providers p ON p.id = pc.provider_id
WHERE pc.user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid
   OR pc.email = 'eric@foundationstoneadvisors.com';

-- STEP 2: Update status to 'active' and set as admin
UPDATE linksy_provider_contacts
SET
  status = 'active',
  invitation_accepted_at = COALESCE(invitation_accepted_at, NOW()),
  provider_role = 'admin',
  contact_type = 'provider_admin'
WHERE user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid
  OR email = 'eric@foundationstoneadvisors.com';

-- STEP 3: Verify the update worked
SELECT
  'AFTER UPDATE' as step,
  pc.id,
  p.name AS provider_name,
  pc.status,
  pc.provider_role,
  pc.contact_type,
  pc.user_id IS NOT NULL as has_user_id
FROM linksy_provider_contacts pc
LEFT JOIN linksy_providers p ON p.id = pc.provider_id
WHERE pc.user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid
   OR pc.email = 'eric@foundationstoneadvisors.com';

-- STEP 4: Test the access function
SELECT
  'ACCESS FUNCTION TEST' as step,
  linksy_user_can_access_provider(
    '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid,
    '3fc0e9d6-f82d-4f7e-8a99-0a3f4fb8aa44'::uuid
  ) as has_access;
-- Should return: true

-- STEP 5: Check what provider-access endpoint will return
SELECT
  'PROVIDER ACCESS API RESULT' as step,
  pc.id,
  pc.provider_id,
  p.name as provider_name,
  pc.contact_type,
  pc.is_primary_contact,
  pc.job_title,
  pc.provider_role,
  pc.status
FROM linksy_provider_contacts pc
JOIN linksy_providers p ON p.id = pc.provider_id
WHERE pc.user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid
  AND pc.status = 'active';
-- Should return at least one row with Impact Clay

-- If the above returns no rows, check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'linksy_provider_contacts';
