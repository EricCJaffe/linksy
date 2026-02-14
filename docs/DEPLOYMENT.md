# Deployment Guide

This guide walks you through deploying the Multi-Tenant SaaS Template to production.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Supabase Setup](#supabase-setup)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
- [Database Migrations](#database-migrations)
- [Storage Configuration](#storage-configuration)
- [Domain and SSL](#domain-and-ssl)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Monitoring and Error Tracking](#monitoring-and-error-tracking)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)

## Overview

The Multi-Tenant SaaS Template is designed to be deployed on Vercel with Supabase as the backend. This setup provides:

- **Zero-downtime deployments** with Vercel
- **Global CDN** for fast content delivery
- **Automatic HTTPS** with SSL certificates
- **Serverless functions** for API routes
- **PostgreSQL database** with Supabase
- **Built-in authentication** and file storage

**Estimated deployment time**: 30-45 minutes

## Prerequisites

Before you begin, ensure you have:

- [ ] A [Vercel account](https://vercel.com/signup) (free tier available)
- [ ] A [Supabase account](https://supabase.com/dashboard) (free tier available)
- [ ] Git repository hosted on GitHub, GitLab, or Bitbucket
- [ ] Node.js 18+ installed locally (for testing)
- [ ] Basic knowledge of PostgreSQL and environment variables

## Supabase Setup

### 1. Create a New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in the project details:
   - **Name**: Your project name (e.g., "Multi-Tenant SaaS")
   - **Database Password**: Generate a strong password (save this securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
4. Click **Create new project**
5. Wait 2-3 minutes for provisioning

### 2. Get API Credentials

Once your project is ready:

1. Navigate to **Settings** → **API**
2. Copy the following values (you'll need these later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (safe for client-side)
   - **service_role key**: `eyJhbG...` (SECRET - server-side only)

### 3. Configure Authentication

1. Navigate to **Authentication** → **Settings**
2. Under **Site URL**, add your production domain:
   ```
   https://yourdomain.com
   ```
3. Under **Redirect URLs**, add:
   ```
   https://yourdomain.com/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Configure email templates (optional):
   - Navigate to **Authentication** → **Email Templates**
   - Customize confirmation and password reset emails

### 4. Create Storage Bucket

1. Navigate to **Storage** → **Buckets**
2. Click **New Bucket**
3. Create a bucket named `files`
4. Set to **Private** (RLS policies will control access)
5. Click **Create bucket**

## Environment Variables

### Local Development

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=SaaS Template
   MULTI_SITE_MODE=false
   SITE_ID=

   # Storage
   NEXT_PUBLIC_STORAGE_BUCKET=files
   MAX_FILE_SIZE_MB=50

   # Authentication
   JWT_SECRET=your-random-32-character-secret
   SESSION_COOKIE_NAME=sb-auth-token
   SESSION_MAX_AGE=604800
   ```

3. Generate a JWT secret:
   ```bash
   openssl rand -base64 32
   ```

### Production Environment Variables

For Vercel deployment, you'll configure these in the Vercel dashboard (see next section).

## Vercel Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### 1. Import Your Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your Git repository:
   - Connect your GitHub/GitLab/Bitbucket account if needed
   - Select your repository
   - Click **Import**

#### 2. Configure Project

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `.` (default)
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `.next` (default)

#### 3. Add Environment Variables

Click **Environment Variables** and add all variables from your `.env.local`:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Production |
| `NEXT_PUBLIC_APP_URL` | (auto-generated) | Preview |
| `NEXT_PUBLIC_APP_NAME` | `Your App Name` | Production, Preview |
| `MULTI_SITE_MODE` | `false` | Production, Preview |
| `NEXT_PUBLIC_STORAGE_BUCKET` | `files` | Production, Preview |
| `MAX_FILE_SIZE_MB` | `50` | Production, Preview |
| `JWT_SECRET` | (generated secret) | Production, Preview |

**Important**: Mark `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` as sensitive.

#### 4. Deploy

1. Click **Deploy**
2. Wait 2-3 minutes for the build to complete
3. Your app will be available at `https://your-project.vercel.app`

### Option 2: Deploy via CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Link to existing project or create new
   - Set production domain

5. Add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   # ... add all other variables
   ```

6. Deploy to production:
   ```bash
   vercel --prod
   ```

### Option 3: Automated CI/CD with GitHub Actions

The template includes a GitHub Actions workflow that automatically deploys on push.

#### 1. Add Vercel Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

   | Secret Name | Value | How to Get |
   |------------|-------|------------|
   | `VERCEL_TOKEN` | Your Vercel token | [Generate token](https://vercel.com/account/tokens) |
   | `VERCEL_ORG_ID` | Your Vercel org ID | Run `vercel whoami` |
   | `VERCEL_PROJECT_ID` | Your project ID | Found in `.vercel/project.json` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | From Supabase dashboard |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | From Supabase dashboard |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service key | From Supabase dashboard |

#### 2. Push to Trigger Deployment

```bash
git push origin main
```

The GitHub Action will:
- Install dependencies
- Run linter and type checks
- Build the application
- Deploy to Vercel
- Comment on PRs with preview URLs

## Database Migrations

### 1. Access Supabase SQL Editor

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Click **New Query**

### 2. Run Initial Schema

Copy and paste the schema from `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
-- (Copy the full schema from your migrations file)
```

Click **Run** to execute.

### 3. Run Additional Migrations

If you have additional migration files, run them in order:

1. `002_add_modules.sql`
2. `003_add_rls_policies.sql`
3. etc.

### 4. Verify Schema

Check that all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

Expected tables:
- `users`
- `tenants`
- `tenant_users`
- `modules`
- `tenant_modules`
- `audit_logs`
- `files`
- `notifications`
- `user_settings`

### 5. Seed Initial Data (Optional)

Add default modules and settings:

```sql
-- Insert default modules
INSERT INTO modules (name, slug, description, icon, is_active)
VALUES
  ('Dashboard', 'dashboard', 'Overview and analytics', 'LayoutDashboard', true),
  ('Users', 'users', 'User management', 'Users', true),
  ('Settings', 'settings', 'Application settings', 'Settings', true);

-- Add more seed data as needed
```

## Storage Configuration

### 1. Configure Storage Policies

1. Navigate to **Storage** → **Policies**
2. Select the `files` bucket
3. Add RLS policies for file access:

#### Policy 1: Users can upload files to their tenant

```sql
CREATE POLICY "Users can upload files to their tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM tenant_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
```

#### Policy 2: Users can read their tenant's files

```sql
CREATE POLICY "Users can read their tenant's files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM tenant_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
```

#### Policy 3: Users can delete their own files

```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM tenant_users
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
```

### 2. Configure CORS

If you need to access files from different domains:

1. Navigate to **Storage** → **Configuration**
2. Add your domain to allowed origins:
   ```json
   ["https://yourdomain.com", "http://localhost:3000"]
   ```

## Domain and SSL

### 1. Add Custom Domain in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain (e.g., `yourdomain.com`)
5. Click **Add**

### 2. Configure DNS

Add the following DNS records at your domain registrar:

**For root domain (yourdomain.com):**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`

**For www subdomain:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

**DNS propagation can take 24-48 hours**

### 3. Verify SSL Certificate

1. Wait for DNS propagation
2. Vercel will automatically provision an SSL certificate
3. Verify at: `https://yourdomain.com`

### 4. Update Supabase URLs

1. Go to Supabase Dashboard
2. Update **Site URL** to: `https://yourdomain.com`
3. Update **Redirect URLs** to include your production domain

## Post-Deployment Configuration

### 1. Create First Tenant

Access your deployed application and sign up:

1. Go to `https://yourdomain.com`
2. Click **Sign Up**
3. Complete registration
4. Verify email

### 2. Promote User to Site Admin

1. Go to Supabase Dashboard → **Table Editor**
2. Select `users` table
3. Find your user and set `role` to `site_admin`

### 3. Configure Tenant

1. Log back into your application
2. Navigate to **Settings**
3. Configure:
   - Company name
   - Branding (logo, colors)
   - Email settings
   - Enabled modules

### 4. Invite Team Members

1. Navigate to **Team** or **Users**
2. Click **Invite User**
3. Enter email and role
4. Send invitation

## Monitoring and Error Tracking

### Sentry Integration (Optional)

#### 1. Create Sentry Project

1. Sign up at [Sentry.io](https://sentry.io/)
2. Create a new project
3. Choose **Next.js** as the platform
4. Copy your DSN

#### 2. Install Sentry

```bash
npm install @sentry/nextjs
```

#### 3. Configure Sentry

Run the wizard:
```bash
npx @sentry/wizard@latest -i nextjs
```

#### 4. Add Environment Variable

Add to Vercel environment variables:
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### Vercel Analytics

1. Go to your project in Vercel Dashboard
2. Navigate to **Analytics**
3. Click **Enable Analytics**
4. Add to your code (optional - auto-enabled):
   ```tsx
   import { Analytics } from '@vercel/analytics/react'

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     )
   }
   ```

### Uptime Monitoring

Consider setting up uptime monitoring with:

- [Better Uptime](https://betteruptime.com/)
- [UptimeRobot](https://uptimerobot.com/)
- [Pingdom](https://www.pingdom.com/)

Configure alerts for:
- Website downtime
- API endpoint failures
- Database connection issues
- High error rates

## Production Checklist

Before going live, verify:

### Security

- [ ] All environment variables are set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is marked as sensitive
- [ ] JWT secret is strong and unique
- [ ] RLS policies are enabled on all tables
- [ ] Storage policies are configured
- [ ] HTTPS is enabled and working
- [ ] Security headers are configured (check next.config.js)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled

### Performance

- [ ] Images are optimized
- [ ] Bundle size is reasonable (check Vercel build output)
- [ ] Database indexes are created
- [ ] Caching is configured (React Query)
- [ ] CDN is working (Vercel handles this)

### Functionality

- [ ] User registration works
- [ ] Email verification works
- [ ] Login/logout works
- [ ] Password reset works
- [ ] File uploads work
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] Search functionality works
- [ ] Notifications appear
- [ ] Activity feed loads
- [ ] Audit logs are recording

### Database

- [ ] All migrations have run successfully
- [ ] Seed data is populated
- [ ] Backups are configured (Supabase handles this)
- [ ] RLS is enabled and tested
- [ ] Indexes are created for common queries

### Monitoring

- [ ] Error tracking is set up (Sentry)
- [ ] Uptime monitoring is configured
- [ ] Analytics are enabled
- [ ] Logs are accessible (Vercel logs)

### Documentation

- [ ] README is up to date
- [ ] API documentation is current
- [ ] Environment variables are documented
- [ ] Deployment process is documented

### Legal

- [ ] Privacy policy is added
- [ ] Terms of service are added
- [ ] Cookie consent is implemented (if needed)
- [ ] GDPR compliance is addressed (if applicable)

## Troubleshooting

### Build Failures

**Error**: `Module not found: Can't resolve 'xyz'`

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Error**: TypeScript errors during build

**Solution**:
```bash
# Run type check locally
npx tsc --noEmit

# Fix all type errors before deploying
```

### Environment Variable Issues

**Error**: `NEXT_PUBLIC_SUPABASE_URL is not defined`

**Solution**:
1. Check Vercel environment variables are set
2. Ensure variables are set for correct environment (Production/Preview)
3. Redeploy after adding variables

### Database Connection Issues

**Error**: Cannot connect to database

**Solution**:
1. Verify Supabase project is active
2. Check `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Verify API keys are valid
4. Check Supabase service status

### Authentication Not Working

**Error**: Users cannot sign up or log in

**Solution**:
1. Check Supabase Auth is enabled
2. Verify redirect URLs include your production domain
3. Check email templates are configured
4. Verify RLS policies on `users` table

### File Uploads Failing

**Error**: Files not uploading

**Solution**:
1. Verify storage bucket `files` exists
2. Check RLS policies on storage.objects
3. Verify `NEXT_PUBLIC_STORAGE_BUCKET` environment variable
4. Check file size limits (default 50MB)
5. Review browser console for specific errors

### 404 Errors on Routes

**Error**: Routes return 404 in production

**Solution**:
1. Ensure all routes are exported properly
2. Check `next.config.js` for rewrite rules
3. Verify Vercel deployment completed successfully
4. Check Vercel function logs for errors

### Slow Performance

**Issue**: Application is slow

**Solution**:
1. Enable React Query caching
2. Add database indexes for slow queries
3. Optimize images (use Next.js Image component)
4. Enable compression in next.config.js
5. Review Vercel Analytics for bottlenecks

### RLS Policy Errors

**Error**: `new row violates row-level security policy`

**Solution**:
1. Review RLS policies in Supabase
2. Ensure policies allow the operation
3. Check user has correct tenant association
4. Verify JWT token includes required claims

## Updating Your Deployment

### Making Changes

1. Make changes locally
2. Test thoroughly
3. Commit and push to your repository:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

4. Vercel will automatically deploy changes
5. Monitor deployment in Vercel Dashboard

### Rolling Back

If something goes wrong:

1. Go to Vercel Dashboard → **Deployments**
2. Find the previous working deployment
3. Click **︙** → **Promote to Production**
4. Confirm the rollback

### Database Migrations

For database changes:

1. Create a new migration file
2. Test locally first
3. Run migration in Supabase SQL Editor
4. Document the migration
5. Deploy application changes

## Support

If you encounter issues:

- **GitHub Issues**: Report bugs and request features
- **Supabase Support**: [Supabase Support](https://supabase.com/support)
- **Vercel Support**: [Vercel Support](https://vercel.com/support)
- **Community**: Join our Discord/Slack (if available)

## Next Steps

After deployment:

1. **Monitor Performance** - Use Vercel Analytics and Sentry
2. **Gather Feedback** - Talk to early users
3. **Iterate** - Add features based on feedback
4. **Scale** - Upgrade Supabase/Vercel plans as needed
5. **Market** - Promote your SaaS product

---

**Congratulations!** 🎉 Your multi-tenant SaaS application is now live!
