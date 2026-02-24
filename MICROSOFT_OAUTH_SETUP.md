# Microsoft OAuth Setup - Quick Reference

## ✅ Your Code is Ready!

The following is already implemented:
- ✅ Microsoft OAuth button in login form
- ✅ OAuth callback handler at `/auth/callback`
- ✅ Middleware configured to allow OAuth redirects
- ✅ Proper error handling and loading states

## 🚀 Quick Start (5 Steps)

### Step 1: Run Configuration Validator

```bash
npx tsx scripts/test-oauth-config.ts
```

This will check your environment and show what's configured.

### Step 2: Azure AD App Registration

**2a) Create App (if needed):**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **Azure Active Directory** → **App registrations** → **New registration**
3. Settings:
   - **Name**: Linksy (or your app name)
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - Click **Register**

**2b) Note Your Client ID:**
- Copy the **Application (client) ID** from the Overview page
- You'll need this for Supabase

**2c) Configure Redirect URIs:**
1. Go to **Authentication** → **Add a platform** → **Web**
2. Add redirect URIs:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   To find YOUR_PROJECT_REF:
   - Go to your Supabase project dashboard
   - It's in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
   - Or check Settings → API → Project URL

3. **Enable ID tokens** (checkbox at bottom)
4. Click **Save**

**2d) Create Client Secret:**
1. Go to **Certificates & secrets** → **Client secrets** → **New client secret**
2. Description: "Linksy OAuth"
3. Expires: 24 months (recommended)
4. Click **Add**
5. **IMPORTANT**: Copy the **Value** immediately (you can't see it again!)
   - NOT the "Secret ID" - copy the actual secret VALUE

### Step 3: Configure Supabase Provider

1. Go to your Supabase project: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication** → **Providers**
3. Find **Azure** in the list
4. Click to expand
5. Toggle **Enable Sign in with Azure**
6. Enter:
   - **Application (client) ID**: Paste from Step 2b
   - **Application (client) secret**: Paste VALUE from Step 2d
7. Click **Save**

### Step 4: Add Allowed Redirect URLs

Still in Supabase, go to: **Authentication** → **URL Configuration**

Add these to **Redirect URLs**:
```
http://localhost:3000/auth/callback
```

For production, also add:
```
https://your-production-domain.com/auth/callback
```

Click **Save**.

### Step 5: Test It!

```bash
# Start your dev server
npm run dev

# Open browser
open http://localhost:3000/login

# Click "Continue with Microsoft"
# Complete the sign-in flow
# You should land on /dashboard
```

## 🧪 Testing Checklist

- [ ] Click "Continue with Microsoft" button
- [ ] Redirects to Microsoft login page
- [ ] Sign in with Microsoft account
- [ ] Redirects back to your app at `/auth/callback`
- [ ] Then redirects to `/dashboard`
- [ ] No errors in browser console
- [ ] User created in database (check Supabase → Authentication → Users)

## 🐛 Troubleshooting

### "OAuth sign-in failed" Error

**Check 1: Redirect URI Mismatch**
```
Azure redirect URI:     https://YOUR_PROJECT.supabase.co/auth/v1/callback
                                                           ^^^^^^^ must include /v1

App allowed redirects:  http://localhost:3000/auth/callback
                                                  ^^^^ NO /v1 here
```

**Check 2: Client Secret**
- Did you copy the VALUE or the Secret ID?
- The value is long (40+ characters)
- Try creating a new secret

**Check 3: Environment Variables**
```bash
# Check these are set in .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### "Invalid redirect URI" from Microsoft

Azure redirect URI doesn't match Supabase.

**Fix:**
1. Get exact redirect URI from Supabase:
   - Project → Authentication → Providers → Azure
   - Look for "Callback URL (for OAuth)" near the bottom
   - Copy EXACTLY as shown
2. Paste into Azure → Authentication → Redirect URIs

### User Created in auth.users but not public.users

The `handle_new_user()` trigger may have failed.

**Check:**
```sql
-- In Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'your-test-email@example.com';
SELECT * FROM public.users WHERE email = 'your-test-email@example.com';
```

If auth.users has the user but public.users doesn't:
```sql
-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create the user (temporary fix)
INSERT INTO public.users (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE email = 'your-test-email@example.com';
```

### Network Tab Shows CORS Error

This usually means:
1. Wrong Supabase URL in .env.local
2. Wrong redirect URL in Supabase settings

**Verify:**
- Supabase URL ends in `.supabase.co` (not `.supabase.com`)
- App URL in allowed redirects matches exactly

## 📚 Additional Resources

- **Detailed Testing Guide**: `docs/OAUTH_TESTING.md`
- **Config Validator**: `npx tsx scripts/test-oauth-config.ts`
- **Supabase OAuth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-azure
- **Azure AD Docs**: https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app

## 🎯 Production Deployment Checklist

Before deploying to production:

- [ ] Add production redirect URI in Azure:
  ```
  https://your-domain.com/auth/callback
  ```

- [ ] Add production URL in Supabase allowed redirects:
  ```
  https://your-domain.com/auth/callback
  ```

- [ ] Update `NEXT_PUBLIC_APP_URL` in production environment:
  ```
  NEXT_PUBLIC_APP_URL=https://your-domain.com
  ```

- [ ] Test OAuth flow in production environment

- [ ] Verify HTTPS is enabled (required for OAuth)

- [ ] Test with different Microsoft account types:
  - [ ] Personal Microsoft account (outlook.com, hotmail.com)
  - [ ] Work/School account (organization)
  - [ ] Guest account

## ✅ Success!

You'll know it's working when:
- Microsoft login completes without errors
- User lands on /dashboard
- User appears in both auth.users and public.users tables
- Session persists across page refreshes
- Logout and re-login works
