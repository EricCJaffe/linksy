# Google OAuth Setup - Quick Reference

## ✅ Your Code is Ready!

The following is already implemented:
- ✅ Google OAuth button in login form
- ✅ OAuth callback handler at `/auth/callback`
- ✅ Middleware configured to allow OAuth redirects
- ✅ Proper error handling and loading states

## 🚀 Quick Start (4 Steps)

### Step 1: Google Cloud Console Setup

**1a) Create OAuth Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project
3. Navigate to: **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: **Linksy** (or your app name)
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** through the scopes and test users sections

**1b) Configure OAuth Client:**
1. Application type: **Web application**
2. Name: **Linksy Web Client** (or your preference)
3. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   ```

   For production, also add:
   ```
   https://your-production-domain.com
   ```

4. **Authorized redirect URIs**:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   To find YOUR_PROJECT_REF:
   - Go to your Supabase project dashboard
   - It's in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
   - Or check Settings → API → Project URL

5. Click **Create**
6. **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately

### Step 2: Configure Supabase Provider

1. Go to your Supabase project: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication** → **Providers**
3. Find **Google** in the list
4. Click to expand
5. Toggle **Enable Sign in with Google**
6. Enter:
   - **Client ID**: Paste from Step 1b
   - **Client Secret**: Paste from Step 1b
7. Click **Save**

### Step 3: Add Allowed Redirect URLs

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

### Step 4: Test It!

```bash
# Start your dev server
npm run dev

# Open browser
open http://localhost:3000/login

# Click "Continue with Google"
# Complete the sign-in flow
# You should land on /dashboard
```

## 🧪 Testing Checklist

- [ ] Click "Continue with Google" button
- [ ] Redirects to Google login page
- [ ] Sign in with Google account
- [ ] Redirects back to your app at `/auth/callback`
- [ ] Then redirects to `/dashboard`
- [ ] No errors in browser console
- [ ] User created in database (check Supabase → Authentication → Users)
- [ ] User profile created in `public.users` table

## 🐛 Troubleshooting

### "OAuth sign-in failed" Error

**Check 1: Redirect URI Mismatch**
```
Google Cloud Console redirect URI:  https://YOUR_PROJECT.supabase.co/auth/v1/callback
                                                                    ^^^^^^^ must include /v1

App allowed redirects:             http://localhost:3000/auth/callback
                                                             ^^^^ NO /v1 here
```

**Check 2: Client Credentials**
- Did you copy the Client ID and Secret correctly?
- Try creating new credentials and updating Supabase

**Check 3: OAuth Consent Screen**
- Is the OAuth consent screen published?
- If using "External" user type, is your test email added to test users?

### "redirect_uri_mismatch" from Google

The redirect URI in Google Cloud Console doesn't match what Supabase is sending.

**Fix:**
1. Get exact redirect URI from Supabase:
   - Project → Authentication → Providers → Google
   - Look for "Callback URL (for OAuth)"
   - Copy EXACTLY as shown
2. Paste into Google Cloud Console → Credentials → Your OAuth Client → Authorized redirect URIs

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

### "Access blocked: This app's request is invalid"

This means the OAuth consent screen needs configuration.

**Fix:**
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Fill in all required fields (app name, support email, etc.)
3. Add your test email to "Test users" if using "External" user type
4. Save and try again

### Network Tab Shows CORS Error

This usually means:
1. Wrong Supabase URL in environment variables
2. Wrong redirect URL in Supabase settings

**Verify:**
- Supabase URL ends in `.supabase.co` (not `.supabase.com`)
- App URL in allowed redirects matches exactly

## 📚 Additional Resources

- **Supabase Google Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2

## 🎯 Production Deployment Checklist

Before deploying to production:

- [ ] Add production redirect URI in Google Cloud Console:
  ```
  https://your-domain.com/auth/callback
  ```

- [ ] Add production authorized origin in Google Cloud Console:
  ```
  https://your-domain.com
  ```

- [ ] Add production URL in Supabase allowed redirects:
  ```
  https://your-domain.com/auth/callback
  ```

- [ ] Verify HTTPS is enabled (required for OAuth)

- [ ] Test OAuth flow in production environment

- [ ] For "External" OAuth consent screen:
  - [ ] Submit app for verification (if needed)
  - [ ] Or keep as "Testing" and manually add users

- [ ] Test with different Google account types:
  - [ ] Personal Gmail account
  - [ ] Google Workspace account
  - [ ] Multiple accounts (account picker)

## ⚙️ OAuth Consent Screen Configuration

### Publishing Status

- **Testing**: Only test users can sign in (up to 100 users)
- **In Production**: Anyone with a Google account can sign in
- **Needs Verification**: Required if requesting sensitive scopes

### Required Scopes

The app uses these default scopes:
- `email`: User's email address
- `profile`: Basic profile information (name, picture)
- `openid`: OpenID Connect authentication

No additional scopes are needed for basic authentication.

### Branding

Recommended to add:
- App logo (120x120px)
- App home page URL
- Privacy policy URL
- Terms of service URL

## ✅ Success!

You'll know it's working when:
- Google login completes without errors
- User lands on /dashboard
- User appears in both auth.users and public.users tables
- Session persists across page refreshes
- Logout and re-login works
- Profile picture from Google displays in UI
