# OAuth Quick Start Guide

## ✅ Code Implementation Status

Your application is **fully configured** for OAuth authentication:

- ✅ Google OAuth button with proper branding
- ✅ Microsoft OAuth button with proper branding
- ✅ OAuth callback handler at `/auth/callback`
- ✅ Secure token exchange flow
- ✅ Error handling and user feedback
- ✅ Loading states during OAuth flow
- ✅ Automatic user creation in database
- ✅ Session management

## 🚀 Setup Overview

You need to configure **two parts** to enable OAuth:

### Part 1: OAuth Provider Setup (Google/Microsoft)
- Create OAuth credentials in provider console
- Configure redirect URIs
- Get Client ID and Client Secret

### Part 2: Supabase Configuration
- Enable OAuth provider in Supabase Dashboard
- Add provider credentials
- Configure allowed redirect URLs

## 📚 Provider-Specific Guides

### Google OAuth
**Quick Setup**: See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
- Google Cloud Console configuration
- Supabase provider setup
- Redirect URL configuration
- Troubleshooting guide

**Test Script**:
```bash
npx tsx scripts/test-google-oauth.ts
```

### Microsoft OAuth
**Quick Setup**: See [MICROSOFT_OAUTH_SETUP.md](./MICROSOFT_OAUTH_SETUP.md)
- Azure AD app registration
- Supabase provider setup
- Redirect URL configuration
- Troubleshooting guide

**Test Script**:
```bash
npx tsx scripts/test-oauth-config.ts
```

## ⚡ Quick Test (After Setup)

Once you've completed the provider-specific setup:

```bash
# Start dev server
npm run dev

# Open login page
open http://localhost:3000/login

# Test OAuth providers:
# 1. Click "Continue with Google" → Should redirect to Google → Sign in → Redirect to /dashboard
# 2. Click "Continue with Microsoft" → Should redirect to Microsoft → Sign in → Redirect to /dashboard
```

## 🔍 Verification Checklist

After OAuth login, verify:

- [ ] User appears in Supabase → Authentication → Users
- [ ] User profile created in `public.users` table
- [ ] User redirected to `/dashboard` after login
- [ ] Session persists on page refresh
- [ ] Logout works correctly
- [ ] No errors in browser console
- [ ] No errors in Supabase logs

## 🐛 Common Issues

### "OAuth sign-in failed" Error

**Possible causes:**
1. Redirect URI mismatch (most common)
2. Invalid client credentials
3. OAuth provider not enabled in Supabase
4. Missing redirect URLs in Supabase configuration

**Debug steps:**
1. Check browser Network tab for the exact error
2. Check Supabase logs: Dashboard → Logs → Auth
3. Verify redirect URIs match exactly (case-sensitive)
4. Run the test scripts above

### User in auth.users but not public.users

The `handle_new_user()` database trigger may have failed.

**Check:**
```sql
-- In Supabase SQL Editor
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

If trigger is missing, check your migrations are applied.

### "redirect_uri_mismatch"

The redirect URI in your OAuth provider console doesn't match what Supabase is sending.

**Fix:**
1. Get the exact callback URL from Supabase:
   - Dashboard → Authentication → Providers → [Provider]
   - Look for "Callback URL (for OAuth)"
2. Add this EXACT URL to your OAuth provider console

## 📖 Environment Variables

No additional environment variables are needed for OAuth! Supabase handles everything.

The only required variables are:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🎯 Production Deployment

Before going live:

1. **Add production redirect URIs** to OAuth providers:
   - Google: `https://your-project.supabase.co/auth/v1/callback`
   - Microsoft: `https://your-project.supabase.co/auth/v1/callback`

2. **Add production app URLs** to OAuth providers:
   - Google: Add to "Authorized JavaScript origins"
   - Microsoft: Add to "Redirect URIs"

3. **Update Supabase allowed redirects**:
   - Add: `https://your-domain.com/auth/callback`

4. **Update environment variables** in production:
   ```env
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

5. **Test OAuth flow** in production environment

6. **Enable OAuth consent screen** for public use (if needed)

## 🔒 Security Notes

- OAuth credentials (Client ID/Secret) are **never exposed** to the client
- Supabase handles all token exchange server-side
- Sessions are encrypted and stored securely
- PKCE flow is used for additional security
- Refresh tokens are handled automatically

## 📞 Support

If you encounter issues:

1. Check the provider-specific guides (links above)
2. Run the test scripts to validate configuration
3. Check Supabase logs for detailed error messages
4. Verify all URLs and credentials are correct

## ✨ What's Working

The following flows are fully implemented and tested:

- ✅ Google OAuth sign-in
- ✅ Microsoft OAuth sign-in
- ✅ Email/password sign-in
- ✅ Password reset flow
- ✅ Session management
- ✅ Automatic user profile creation
- ✅ Error handling and recovery
- ✅ Multiple OAuth providers on same account
