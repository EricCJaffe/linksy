# Environment

## Required Env Vars

These must be set for the app to function:

| Variable | Where Used | Notes |
|----------|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Public/anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` | **Secret.** Bypasses RLS. Server-only. |
| `OPENAI_API_KEY` | `app/api/linksy/search/route.ts` | Required for AI search. Lazy-initialized. |

## Recommended Env Vars

| Variable | Where Used | Notes |
|----------|-----------|-------|
| `NEXT_PUBLIC_APP_URL` | CSRF validation, email links | Base URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SITE_URL` | `middleware.ts` CSRF checks | Should match APP_URL |
| `NEXT_PUBLIC_APP_NAME` | UI display | Application name |
| `GOOGLE_MAPS_API_KEY` | `lib/utils/geocode.ts` | Server-side geocoding. Optional — search works without it (no distance sorting). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `lib/utils/geocode.ts` | Client-side static map images |

## Email (pick one)

| Variable | Notes |
|----------|-------|
| `RESEND_API_KEY` | Resend email service (recommended) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM_EMAIL` | Sender address |
| `SMTP_FROM_NAME` | Sender display name |

If neither is configured, emails are logged to console in development.

## Feature Flags

| Variable | Default | Controls |
|----------|---------|----------|
| `NEXT_PUBLIC_ENABLE_ACTIVITY_FEED` | `true` | Activity feed module |
| `NEXT_PUBLIC_ENABLE_FILE_UPLOADS` | `true` | File upload UI |
| `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | `true` | Notification system |
| `NEXT_PUBLIC_ENABLE_AUDIT_LOGS` | `true` | Audit log recording |

## Optional / Monitoring

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking (not yet integrated — see TODO in `lib/utils/logger.ts`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host (default `https://app.posthog.com`) |

## Rate Limiting

| Variable | Default | Notes |
|----------|---------|-------|
| `API_RATE_LIMIT_PER_MINUTE` | `100` | Per-IP API rate limit |
| `FILE_UPLOAD_RATE_LIMIT_PER_HOUR` | `20` | Per-user upload limit |

## Multi-Tenant Config

| Variable | Default | Notes |
|----------|---------|-------|
| `MULTI_SITE_MODE` | `false` | `true` = subdomain-per-tenant |
| `SITE_ID` | (empty) | Required when `MULTI_SITE_MODE=false` |

## Secrets

- **Never commit** `.env.local` — it is gitignored.
- Copy `.env.example` to `.env.local` for local dev.
- In Vercel, set env vars in the project dashboard under Settings > Environment Variables.
- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are the most sensitive — server-only, never prefix with `NEXT_PUBLIC_`.

## Local Setup Notes

- Node.js 18+ required
- No OS-specific steps
- `npm install` then `cp .env.example .env.local` and fill in values
