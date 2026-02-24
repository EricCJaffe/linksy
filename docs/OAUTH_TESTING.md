# Microsoft OAuth Testing Guide

## Pre-Test Checklist

### Azure AD Configuration
- [ ] App registration created in Azure Portal
- [ ] Client ID copied to Supabase
- [ ] Client Secret created and copied to Supabase
- [ ] Redirect URI added: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- [ ] API permissions set: `email`, `openid`, `profile`
- [ ] ID tokens enabled in Authentication settings

### Supabase Configuration
- [ ] Azure provider enabled in Authentication → Providers
- [ ] Client ID entered
- [ ] Client Secret entered
- [ ] Callback URL added to allowed list: `http://localhost:3000/auth/callback`

### Local Environment
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000` set
- [ ] Dev server running on port 3000

## Test Scenarios

### 1. New User Sign-Up via Microsoft

**Steps:**
1. Navigate to `/login`
2. Click "Continue with Microsoft" button
3. Sign in with a Microsoft account that's NOT in your system
4. Should redirect to Microsoft login
5. After Microsoft auth, should redirect back to your app
6. Should land on `/dashboard`

**Expected Results:**
- ✅ New user created in Supabase auth.users
- ✅ New user created in public.users via `handle_new_user()` trigger
- ✅ User has `full_name` and `email` populated from Microsoft profile
- ✅ User successfully logged in
- ✅ No errors in browser console

**Check in Supabase:**
```sql
-- Check auth.users
SELECT id, email, raw_app_meta_data, raw_user_meta_data
FROM auth.users
WHERE email = 'test@microsoft.com';

-- Check public.users
SELECT id, email, full_name, created_at
FROM public.users
WHERE email = 'test@microsoft.com';
```

### 2. Existing User Sign-In via Microsoft

**Steps:**
1. Create a user first via email/password or Microsoft
2. Log out
3. Navigate to `/login`
4. Click "Continue with Microsoft" button
5. Use the SAME Microsoft account

**Expected Results:**
- ✅ Existing user found and authenticated
- ✅ No duplicate user created
- ✅ Redirects to `/dashboard`
- ✅ Session cookie set correctly

### 3. OAuth Redirect Flow

**Steps:**
1. While logged out, navigate to `/dashboard/tickets`
2. Should redirect to `/login?redirect=/dashboard/tickets`
3. Click "Continue with Microsoft"
4. After Microsoft auth completes

**Expected Results:**
- ✅ User lands on `/dashboard/tickets` (original destination)
- ✅ NOT on `/dashboard` (default)

### 4. Account Linking (Same Email, Different Providers)

**Test Setup:**
1. Create account with email/password: `test@example.com`
2. Log out
3. Try to sign in with Microsoft using `test@example.com`

**Expected Behavior:**
- Supabase default: Will link accounts if emails match
- User will be signed in with Microsoft OAuth
- Original password still works

### 5. Error Handling

**Test A: User Cancels OAuth Flow**
1. Click "Continue with Microsoft"
2. On Microsoft login page, click Cancel/Back
3. Should redirect to `/login?error=oauth_error`
4. Error message displayed: "OAuth sign-in failed. Please try again."

**Test B: Invalid Configuration**
1. Temporarily disable Azure provider in Supabase
2. Click "Continue with Microsoft"
3. Should show error message

## Debugging Tools

### Check Network Tab
Open DevTools → Network tab when clicking "Continue with Microsoft":

1. **Initial OAuth Request**
   - Should redirect to `https://login.microsoftonline.com/...`
   - Check URL parameters: `client_id`, `redirect_uri`, `response_type=code`

2. **Callback Request**
   - After Microsoft auth, redirects to `/auth/callback?code=...`
   - Code parameter should be present

3. **Session Exchange**
   - `/auth/callback` should call Supabase to exchange code for session
   - Should set cookies

### Check Browser Console
Look for:
- ✅ No CORS errors
- ✅ No 401/403 errors
- ✅ Supabase session set successfully

### Check Supabase Logs
Go to Supabase Dashboard → Logs → Auth Logs:
- Filter by "Microsoft" or "azure"
- Look for successful sign-ins
- Check for error messages

## Common Issues & Fixes

### Issue: "OAuth sign-in failed" immediately

**Cause:** Redirect URL mismatch
**Fix:**
- Verify in Azure: Redirect URI = `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- Check Supabase allowed redirects include your app URL + `/auth/callback`

### Issue: Redirects to Microsoft but then fails

**Cause:** Invalid Client Secret
**Fix:**
- Regenerate secret in Azure
- Update in Supabase (use the VALUE, not the ID)

### Issue: "Invalid redirect URI" error

**Cause:** Mismatch between Azure and Supabase callback URLs
**Fix:**
- Azure redirect URI must EXACTLY match: `https://<project-ref>.supabase.co/auth/v1/callback`
- Note: Use `supabase.co`, not `supabase.com`

### Issue: User created in auth.users but not public.users

**Cause:** `handle_new_user()` trigger failed
**Fix:**
1. Check trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Check function uses `public.users`:
   ```sql
   \df+ public.handle_new_user
   ```

3. Re-run migration if needed

### Issue: Works in dev, fails in production

**Checklist:**
- [ ] Production Azure redirect URI added: `https://yourdomain.com/auth/callback`
- [ ] Production URL added to Supabase allowed redirects
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] HTTPS enabled (required for OAuth)

## Manual Test Script

Run this to verify all pieces:

```bash
# 1. Check environment
echo "APP_URL: $NEXT_PUBLIC_APP_URL"
echo "SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"

# 2. Start dev server
npm run dev

# 3. Open browser
open http://localhost:3000/login

# 4. Test flow (manual)
# - Click Microsoft button
# - Complete auth
# - Verify redirect

# 5. Check database
# (Use Supabase SQL editor)
```

## Success Criteria

All tests pass when:
- ✅ New users can sign up with Microsoft
- ✅ Existing users can sign in with Microsoft
- ✅ Redirect flow preserves intended destination
- ✅ User data populates correctly in both auth and public tables
- ✅ No console errors
- ✅ Session persists across page refreshes
- ✅ User can log out and log back in

## Next Steps After Successful Testing

1. Test with multiple Microsoft accounts (personal + work accounts)
2. Test account linking scenarios
3. Test logout and re-login
4. Document any custom scopes needed (if any)
5. Set up monitoring for OAuth failures
6. Configure production redirect URLs
