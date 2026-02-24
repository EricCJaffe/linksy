# Environment

## Required Env Vars

These must be set for the app to function:

| Variable | Where Used | Notes |
|----------|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Public/anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` | **Secret.** Bypasses RLS. Server-only. |
| `OPENAI_API_KEY` | `app/api/linksy/search/route.ts`, `scripts/generate-embeddings.js` | Required for AI search and embedding generation. |

## Recommended Env Vars

| Variable | Where Used | Notes |
|----------|-----------|-------|
| `NEXT_PUBLIC_APP_URL` | Invitation redirects + email links (`app/api/invitations/route.ts`, `app/api/tickets/route.ts`, `app/api/providers/[id]/contacts/[contactId]/invite/route.ts`) | Base URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SITE_URL` | `lib/middleware/csrf.ts` | Used in CSRF allowed-origin list |
| `NEXT_PUBLIC_APP_NAME` | UI display | Application name |
| `GOOGLE_MAPS_API_KEY` | `lib/utils/geocode.ts` | Server-side geocoding. Optional — search works without it (no distance sorting). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `lib/utils/geocode.ts` | Client-side static map images |
| `ADMIN_EMAIL` | `app/api/onboarding/provider/route.ts`, `app/api/onboarding/host/route.ts` | Receives onboarding submissions (falls back to `SMTP_FROM_EMAIL`) |
| `VERCEL_URL` | `lib/middleware/csrf.ts` | Added as an allowed origin in deployed environments |

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

## Error Tracking (Optional)

| Variable | Where Used | Notes |
|----------|------------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | `sentry.client.config.ts`, `sentry.edge.config.ts`, fallback in `sentry.server.config.ts` | Enables Sentry in client/edge |
| `SENTRY_DSN` | `sentry.server.config.ts` | Server-side DSN (preferred for server runtime) |
| `SENTRY_AUTH_TOKEN` | `next.config.js` | Enables Sentry source map upload during build |

## Template Vars in `.env.example`

The following keys are present in `.env.example` but are not currently read in app code:
- `NEXT_PUBLIC_ENABLE_ACTIVITY_FEED`, `NEXT_PUBLIC_ENABLE_FILE_UPLOADS`, `NEXT_PUBLIC_ENABLE_NOTIFICATIONS`, `NEXT_PUBLIC_ENABLE_AUDIT_LOGS`
- `API_RATE_LIMIT_PER_MINUTE`, `FILE_UPLOAD_RATE_LIMIT_PER_HOUR`
- `NEXT_PUBLIC_STORAGE_BUCKET`, `MAX_FILE_SIZE_MB`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `JWT_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE`, `DEBUG`, `SKIP_EMAIL_VERIFICATION`, `LOG_LEVEL`

## Multi-Tenant Config

| Variable | Default | Notes |
|----------|---------|-------|
| `MULTI_SITE_MODE` | `false` | `true` = subdomain-per-tenant |
| `SITE_ID` | (empty) | Required when `MULTI_SITE_MODE=false` |

## Secrets

- **Never commit** `.env.local` — it is gitignored.
- Copy `.env.example` to `.env.local` for local dev.
- In Vercel, set env vars in the project dashboard under Settings > Environment Variables.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `SMTP_PASSWORD`, and `SENTRY_AUTH_TOKEN` are server secrets.

## Local Setup Notes

- Node.js 18+ required
- No OS-specific steps
- `npm install` then `cp .env.example .env.local` and fill in values
