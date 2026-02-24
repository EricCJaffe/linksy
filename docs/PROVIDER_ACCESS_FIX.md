# Provider Access Issues - Root Cause & Fix

## Problem Summary

User `eric@foundationstoneadvisors.com` (provider contact for Impact Clay) is experiencing:
1. ⚠️ "Loading workspace..." spinner that hangs on initial login
2. ❌ 403 Forbidden errors when trying to access provider data
3. ❌ "User has no tenant memberships" warning in console

## Root Causes

### Issue 1: Contact Status Not Updated to 'Active'
**Problem:** The `link_invited_user_to_contact()` trigger was running on the wrong table (`public.users` instead of `auth.users`), so it couldn't access `raw_user_meta_data.contact_id` to properly link and activate the contact.

**Impact:** Contact record remains with `status = 'invited'` instead of `status = 'active'`, causing the `linksy_user_can_access_provider` RPC function to return FALSE.

**Fix:** Migration `20260224230000_fix_contact_linking_trigger.sql` moves the trigger to `auth.users` table.

### Issue 2: Provider Users Don't Have Tenant Memberships
**Problem:** The system has two parallel access systems:
- **Tenant system**: For platform organizations using Linksy (requires `tenant_users` membership)
- **Provider system**: For service organizations listed in the directory (uses `linksy_provider_contacts`)

Provider contacts don't automatically get tenant memberships, which causes:
- The `useCurrentTenant` hook to log warnings
- The org switcher to show "Loading..." indefinitely (until refresh)
- Auth middleware checks for `isTenantAdmin` to fail

**Impact:** While the system technically works (provider access is separate), the UI expects users to have tenant memberships.

**Current Workaround:** The dashboard layout shows the spinner while `isTenantLoading` is true, but eventually completes and shows the UI. The org switcher returns `null` when there are no tenant memberships, which is handled correctly.

**Long-term Solution:** We have two options:
1. **Keep systems separate** (current): Provider contacts don't need tenant memberships. The UI should be updated to handle provider-only users without warnings.
2. **Auto-create tenant**: When a provider contact is created, automatically create a corresponding tenant and membership for that provider organization.

For MVP, we're going with option 1 (keep systems separate). Provider users will not have tenant memberships, and that's expected behavior.

## Quick Fix Steps

Run these SQL commands in Supabase SQL Editor:

```sql
-- 1. Apply trigger fix
DROP TRIGGER IF EXISTS link_invited_user_trigger ON public.users;
DROP TRIGGER IF EXISTS link_invited_user_trigger ON auth.users;

CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_email := NEW.email;

  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,
      full_name = NULL
    WHERE id = v_contact_id AND user_id IS NULL;

  ELSIF v_user_email IS NOT NULL THEN
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

CREATE TRIGGER link_invited_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_invited_user_to_contact();

-- 2. Manually activate existing contact (since they signed up before trigger fix)
UPDATE linksy_provider_contacts
SET
  status = 'active',
  invitation_accepted_at = COALESCE(invitation_accepted_at, NOW())
WHERE email = 'eric@foundationstoneadvisors.com'
  AND status = 'invited';

-- 3. Verify access works
SELECT linksy_user_can_access_provider(
  (SELECT id FROM public.users WHERE email = 'eric@foundationstoneadvisors.com'),
  '3fc0e9d6-f82d-4f7e-8a99-0a3f4fb8aa44'::uuid
);
-- Should return: true

-- 4. Verify contact has admin role
SELECT
  pc.provider_role,
  pc.contact_type,
  pc.status,
  p.name
FROM linksy_provider_contacts pc
JOIN linksy_providers p ON p.id = pc.provider_id
WHERE pc.user_id = (SELECT id FROM public.users WHERE email = 'eric@foundationstoneadvisors.com');

-- If provider_role is not 'admin', update it:
-- UPDATE linksy_provider_contacts
-- SET provider_role = 'admin', contact_type = 'provider_admin'
-- WHERE user_id = (SELECT id FROM public.users WHERE email = 'eric@foundationstoneadvisors.com');
```

## Expected Behavior After Fix

✅ Contact status updated to 'active'
✅ `linksy_user_can_access_provider()` returns TRUE
✅ User can view their provider's data
✅ User can edit provider fields (based on provider_role)
✅ Dashboard shows organization info and stats
✅ No more 403 errors

The "User has no tenant memberships" warning will still appear in console - this is expected for provider-only users and can be safely ignored.

## Files Modified

- `supabase/migrations/20260224230000_fix_contact_linking_trigger.sql` (new)
- `app/api/stats/my-provider/route.ts` (new)
- `lib/hooks/useMyProviderStats.ts` (new)
- `app/dashboard/page.tsx` (enhanced with provider org info)
- `components/layout/sidebar.tsx` (hide Providers tab for non-admins)
- `TROUBLESHOOTING.sql` (diagnostic queries)
- `docs/PROVIDER_ACCESS_FIX.md` (this file)

## Future Improvements

1. **Suppress tenant warnings for provider-only users**: Update `useCurrentTenant` to not log warnings if user has provider access
2. **Simplify access logic**: Consider consolidating tenant and provider access into a single auth context
3. **Provider auto-tenanting**: Optionally auto-create a tenant for each provider organization
