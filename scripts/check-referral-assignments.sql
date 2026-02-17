-- Check referral assignments and default handlers
-- Run this to debug assignment issues

-- 1. Check providers with default handlers
SELECT
  p.id,
  p.name,
  pc.user_id as default_handler_user_id,
  u.full_name as default_handler_name,
  u.email as default_handler_email,
  pc.is_default_referral_handler
FROM linksy_providers p
LEFT JOIN linksy_provider_contacts pc ON p.id = pc.provider_id AND pc.is_default_referral_handler = true
LEFT JOIN users u ON pc.user_id = u.id
WHERE p.status = 'active'
ORDER BY p.name
LIMIT 20;

-- 2. Check referrals and their assignments
SELECT
  t.ticket_number,
  t.client_name,
  t.status,
  t.client_user_id as assigned_user_id,
  u.full_name as assigned_to_name,
  u.email as assigned_to_email,
  p.name as provider_name,
  pc.is_default_referral_handler
FROM linksy_tickets t
LEFT JOIN users u ON t.client_user_id = u.id
LEFT JOIN linksy_providers p ON t.provider_id = p.id
LEFT JOIN linksy_provider_contacts pc ON t.client_user_id = pc.user_id AND t.provider_id = pc.provider_id
WHERE t.ticket_number LIKE 'LINK-1217%'
ORDER BY t.created_at DESC
LIMIT 20;

-- 3. Check contact count per provider
SELECT
  p.id,
  p.name,
  COUNT(pc.id) as contact_count,
  SUM(CASE WHEN pc.is_default_referral_handler THEN 1 ELSE 0 END) as default_handler_count,
  SUM(CASE WHEN pc.is_primary_contact THEN 1 ELSE 0 END) as primary_contact_count
FROM linksy_providers p
LEFT JOIN linksy_provider_contacts pc ON p.id = pc.provider_id
WHERE p.status = 'active'
GROUP BY p.id, p.name
HAVING COUNT(pc.id) > 0
ORDER BY p.name
LIMIT 20;
