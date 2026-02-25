# OAuth Setup Guide - Google & Microsoft

This guide walks through configuring OAuth authentication for Linksy.

## Prerequisites

- [ ] Supabase project: `vjusthretnfmxmgdiwtw`
- [ ] Local dev server running: `npm run dev`
- [ ] Admin access to Google Cloud Console
- [ ] Admin access to Azure Portal (for Microsoft)

---

## Part 1: Google OAuth Setup

### Step 1: Google Cloud Console Configuration

1. **Navigate to Google Cloud Console**
   - URL: https://console.cloud.google.com/

2. **Create New Project** (or select existing)
   - Click project dropdown at top
   - Click "New Project"
   - Project name: `Linksy Production`
   - Click "Create"
   - Wait for project creation (~30 seconds)
   - Switch to the new project

3. **Enable Google+ API**
   - In search bar, type: "Google+ API"
   - Click "Google+ API"
   - Click "ENABLE" button
   - Wait for activation (~10 seconds)

4. **Configure OAuth Consent Screen**
   - Left sidebar → "APIs & Services" → "OAuth consent screen"
   - Choose **External** (for public users)
   - Click "CREATE"

   **App Information:**
   - App name: `Linksy`
   - User support email: `your-email@domain.com`
   - App logo: (optional)
   - Application home page: `http://localhost:3000` (for now)
   - Application privacy policy: `http://localhost:3000/privacy` (update later)
   - Application terms of service: `http://localhost:3000/terms` (update later)

   **Developer Contact:**
   - Email addresses: `your-email@domain.com`

   Click "SAVE AND CONTINUE"

5. **Add Scopes**
   - Click "ADD OR REMOVE SCOPES"
   - Check these scopes:
     - ✅ `.../auth/userinfo.email`
     - ✅ `.../auth/userinfo.profile`
     - ✅ `openid`
   - Click "UPDATE"
   - Click "SAVE AND CONTINUE"

6. **Add Test Users** (for testing phase)
   - Click "ADD USERS"
   - Add your test emails:
     - `ejaffejax@gmail.com`
     - Any other test users
   - Click "ADD"
   - Click "SAVE AND CONTINUE"

   **Note:** While app is in "Testing" mode, only these users can sign in. When ready for production, you'll publish the app.

7. **Review and Go Back to Dashboard**
   - Click "BACK TO DASHBOARD"

8. **Create OAuth Credentials**
   - Left sidebar → "Credentials"
   - Click "CREATE CREDENTIALS" → "OAuth client ID"

   **Application type:** Web application

   **Name:** `Linksy Web Client`

   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://vjusthretnfmxmgdiwtw.supabase.co
   ```
   (Add production domain later)

   **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/callback
   https://vjusthretnfmxmgdiwtw.supabase.co/auth/v1/callback
   ```
   (Add production callback later)

   Click "CREATE"

9. **Copy Credentials**
   - A modal will appear with:
     - **Client ID**: `xxxxx-yyyyy.apps.googleusercontent.com`
     - **Client Secret**: `GOCSPX-xxxxx`
   - ⚠️ **COPY THESE NOW** - you'll need them in next step
   - Click "OK"

---

### Step 2: Supabase Dashboard Configuration

1. **Open Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/vjusthretnfmxmgdiwtw

2. **Navigate to Authentication → Providers**
   - Left sidebar → "Authentication"
   - Click "Providers" tab

3. **Enable Google Provider**
   - Find "Google" in the provider list
   - Toggle it **ON** (switch to enabled)

   **Paste Credentials:**
   - Client ID: `[paste from Google Cloud Console]`
   - Client Secret: `[paste from Google Cloud Console]`

   Click "Save"

4. **Configure URL Settings**
   - Go to "Authentication" → "URL Configuration"

   **Site URL:** `http://localhost:3000`

   **Redirect URLs:** (should already include)
   ```
   http://localhost:3000/auth/callback
   ```

   If not present, add it and click "Save"

5. **Enable Automatic Account Linking** (for simplicity)
   - Still in "Authentication" section
   - Look for settings gear icon (⚙️) at top right
   - OR go to "Settings" tab under Authentication

   **Find one of these settings:**
   - "Automatic account linking"
   - "Allow users to sign up with the same email"
   - "Link accounts with matching verified emails"

   Toggle it **ON**

   Click "Save"

   **Note:** This allows users to sign in with either email/password OR Google using the same email address.

6. **Verify Email Confirmation is Enabled**
   - Go to "Authentication" → "Email Templates"
   - Check that "Enable email confirmations" is ON
   - This ensures only verified emails get linked (security)

---

### Step 3: Test Google OAuth (Local Development)

**Prerequisites:**
- [ ] Google Cloud Console configured
- [ ] Supabase configured
- [ ] Dev server running: `npm run dev`

#### Test A: New User Sign-In

1. Open incognito/private browser window
2. Navigate to: `http://localhost:3000/login`
3. Click "Continue with Google" button
4. Sign in with a Google account NOT already in your system
5. ✅ **Expected:** Redirects to `/dashboard`
6. ✅ **Verify in Supabase:**
   - Dashboard → Authentication → Users
   - Find the new user
   - Email should match Google account
   - Provider should show "google"

#### Test B: Existing Email/Password User (Account Linking)

1. You should already have `ejaffejax@gmail.com` with email/password
2. Sign out if logged in
3. Go to: `http://localhost:3000/login`
4. Click "Continue with Google"
5. Choose your `ejaffejax@gmail.com` Google account
6. ✅ **Expected:** Redirects to `/dashboard` (using existing user ID)
7. ✅ **Verify in Supabase:**
   ```sql
   -- Run in SQL Editor
   SELECT
     u.id,
     u.email,
     u.created_at,
     (SELECT json_agg(json_build_object(
       'provider', i.provider,
       'created_at', i.created_at
     ))
     FROM auth.identities i
     WHERE i.user_id = u.id) as linked_providers
   FROM auth.users u
   WHERE u.email = 'ejaffejax@gmail.com';
   ```

   Should show:
   ```json
   {
     "linked_providers": [
       {"provider": "email", "created_at": "..."},
       {"provider": "google", "created_at": "..."}
     ]
   }
   ```

8. Sign out and sign in with email/password → ✅ Should work
9. Sign out and sign in with Google → ✅ Should work

#### Test C: Error Handling

1. Revoke app access in your Google account settings
2. Try to sign in again
3. ✅ **Expected:** Error message displayed on login page
4. Check browser console for detailed error logs

---

## Part 2: Microsoft (Azure AD) OAuth Setup

### Step 1: Azure Portal Configuration

1. **Navigate to Azure Portal**
   - URL: https://portal.azure.com/

2. **Navigate to Azure AD App Registrations**
   - Search for "App registrations" in top search bar
   - Click "App registrations"

3. **Create New Registration**
   - Click "New registration"

   **Name:** `Linksy`

   **Supported account types:**
   - Select: "Accounts in any organizational directory and personal Microsoft accounts"

   **Redirect URI:**
   - Platform: Web
   - URI: `https://vjusthretnfmxmgdiwtw.supabase.co/auth/v1/callback`

   Click "Register"

4. **Copy Application (client) ID**
   - On the app overview page
   - Copy "Application (client) ID" - you'll need this
   - Example: `12345678-1234-1234-1234-123456789abc`

5. **Create Client Secret**
   - Left sidebar → "Certificates & secrets"
   - Click "New client secret"
   - Description: `Linksy OAuth Secret`
   - Expires: `24 months` (or as needed)
   - Click "Add"
   - ⚠️ **COPY THE SECRET VALUE NOW** - it won't be shown again
   - Example: `abc123def456ghi789`

6. **Configure API Permissions**
   - Left sidebar → "API permissions"
   - Click "Add a permission"
   - Choose "Microsoft Graph"
   - Choose "Delegated permissions"
   - Search and add:
     - ✅ `email`
     - ✅ `openid`
     - ✅ `profile`
   - Click "Add permissions"
   - Click "Grant admin consent for [your org]" (if you have admin rights)

7. **Add Additional Redirect URIs**
   - Left sidebar → "Authentication"
   - Under "Platform configurations" → "Web"
   - Click "Add URI"
   - Add: `http://localhost:3000/auth/callback`
   - Scroll down and check:
     - ✅ "Access tokens"
     - ✅ "ID tokens"
   - Click "Save"

---

### Step 2: Supabase Dashboard Configuration (Microsoft)

1. **Open Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/vjusthretnfmxmgdiwtw

2. **Navigate to Authentication → Providers**
   - Left sidebar → "Authentication"
   - Click "Providers" tab

3. **Enable Azure Provider**
   - Find "Azure" in the provider list
   - Toggle it **ON**

   **Paste Credentials:**
   - Azure Client ID: `[paste Application (client) ID from Azure]`
   - Azure Secret: `[paste Client Secret value from Azure]`

   Click "Save"

---

### Step 3: Test Microsoft OAuth

Same test scenarios as Google (A, B, C above), but click "Continue with Microsoft" instead.

**Note:** Microsoft accounts to test with:
- Personal Microsoft accounts (outlook.com, hotmail.com, live.com)
- Work/school accounts (if you have Azure AD org access)

---

## Troubleshooting

### "Access Denied" Error

**Cause:** User not in test users list (Google) or app not published

**Fix:**
- Google: Add user to test users in OAuth consent screen
- Microsoft: Check app registration permissions

### "Redirect URI Mismatch"

**Cause:** Redirect URI doesn't match configured URIs

**Fix:**
- Google: Check "Authorized redirect URIs" in credentials
- Microsoft: Check "Redirect URIs" in Authentication section
- Supabase: Check "Redirect URLs" in URL Configuration

### Duplicate Users Created

**Cause:** Automatic account linking is not enabled

**Fix:** Enable in Supabase → Authentication → Settings

### "Invalid Client" Error

**Cause:** Wrong Client ID or Client Secret

**Fix:** Double-check credentials in Supabase match Google Cloud Console / Azure Portal

---

## Post-Testing: Publish for Production

### Google:
1. Go to OAuth consent screen
2. Click "PUBLISH APP"
3. Submit for verification (if needed)
4. Update redirect URIs to include production domain

### Microsoft:
1. App is already public if you selected "Accounts in any organizational directory and personal Microsoft accounts"
2. Update redirect URIs to include production domain

### Supabase:
1. Update "Site URL" to production domain
2. Add production redirect URL to "Redirect URLs"

---

## Security Checklist

- [ ] Client secrets stored in Supabase only (not in code)
- [ ] Redirect URIs restricted to your domains only
- [ ] Email verification enabled in Supabase
- [ ] Automatic account linking enabled (for user convenience)
- [ ] Test users removed from OAuth consent screen (Google) before publishing
- [ ] API permissions limited to email, profile, openid only
- [ ] Production URLs configured before public launch

---

## Quick Reference

**Supabase Project:** `vjusthretnfmxmgdiwtw`

**Redirect URLs:**
- Dev: `http://localhost:3000/auth/callback`
- Supabase: `https://vjusthretnfmxmgdiwtw.supabase.co/auth/v1/callback`
- Production: `https://your-domain.com/auth/callback` (add when ready)

**Test Accounts:**
- Google: `ejaffejax@gmail.com`
- Microsoft: (your test accounts)
