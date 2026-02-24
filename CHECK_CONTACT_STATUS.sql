-- Check the current status of eric@foundationstoneadvisors.com's contact record
-- This will help us debug why Provider Portal isn't showing

SELECT
  pc.id,
  pc.provider_id,
  p.name AS provider_name,
  pc.user_id,
  pc.email,
  pc.full_name,
  pc.status,
  pc.provider_role,
  pc.contact_type,
  pc.invitation_sent_at,
  pc.invitation_accepted_at,
  pc.created_at
FROM linksy_provider_contacts pc
LEFT JOIN linksy_providers p ON p.id = pc.provider_id
WHERE pc.user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid
   OR pc.email = 'eric@foundationstoneadvisors.com';

-- Expected result:
-- status should be 'active'
-- user_id should be '0e4fb722-df91-4fab-90d1-ccd01187fd32'
-- provider_role should be 'admin' or 'user'

-- If status is still 'invited', run this:
-- UPDATE linksy_provider_contacts
-- SET status = 'active', invitation_accepted_at = COALESCE(invitation_accepted_at, NOW())
-- WHERE user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid;

-- To make user an admin:
-- UPDATE linksy_provider_contacts
-- SET provider_role = 'admin', contact_type = 'provider_admin'
-- WHERE user_id = '0e4fb722-df91-4fab-90d1-ccd01187fd32'::uuid;
