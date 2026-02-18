# Project Context

## Purpose

Linksy is an AI-powered community resource search and referral management platform,
currently deployed for Clay County, Florida. It lets residents describe what help they
need in natural language, then uses vector-similarity search and an LLM to find and
present relevant local providers (nonprofits, government agencies, faith-based orgs,
businesses). The admin dashboard allows site administrators to manage providers,
referral tickets, needs taxonomy, events, crisis keywords, and host widget
configurations.

The codebase is built on top of a generic multi-tenant SaaS template and extends it
with the Linksy domain layer (`linksy_*` tables, AI search, widget embedding,
provider portal).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, React 18) |
| Language | TypeScript 5 (strict mode) |
| Database | Supabase (PostgreSQL + pgvector + PostGIS) |
| Auth | Supabase Auth (cookie-based SSR sessions) |
| Storage | Supabase Storage (`tenant-uploads`, `user-uploads`) |
| AI | OpenAI (`text-embedding-3-small` for embeddings, `gpt-4o-mini` for chat) |
| Geocoding | Google Maps Geocoding API |
| Email | Resend (primary) or SMTP via Nodemailer (fallback) |
| UI | Tailwind CSS + Radix UI (shadcn/ui) + Lucide icons |
| State | React Query (TanStack Query v5) |
| Forms | React Hook Form + Zod validation |
| Deploy | Vercel |

## Key Entry Points

- `app/layout.tsx` — root layout (HTML shell, global providers)
- `app/providers.tsx` — React Query provider, Supabase auth listener
- `middleware.ts` — auth session refresh, rate limiting, CSRF, route protection
- `app/find-help/[slug]/page.tsx` — public widget page per host provider
- `app/api/linksy/search/route.ts` — AI search pipeline (embedding → vector search → LLM)

## Routing Structure

**Public routes:**
- `/` — landing page
- `/login`, `/signup`, `/reset-password` — auth pages
- `/find-help/[slug]` — embeddable community resource widget
- `/api/public/*` — unauthenticated API endpoints

**Auth routes (under `(auth)/` group):**
- `/login`, `/signup`, `/reset-password`, `/invite/[token]`
- `/auth/callback` — Supabase OAuth callback

**Dashboard routes (protected — require login):**
- `/dashboard/providers/[id]` — provider detail (tabbed: summary, contacts, referrals, host settings, etc.)
- `/dashboard/my-organization` — provider portal for linked staff
- `/dashboard/tickets/[id]` — referral ticket detail
- `/dashboard/needs` — needs taxonomy management
- `/dashboard/admin/crisis` — crisis keyword management
- `/dashboard/admin/reports` — analytics and reports
- `/dashboard/admin/hosts` — host provider management
- `/dashboard/settings/*` — profile, branding, users, modules

## Auth and Membership

- **Auth provider:** Supabase Auth (email/password + Google OAuth + Microsoft OAuth via Azure)
- **OAuth:** `components/auth/login-form.tsx` calls `supabase.auth.signInWithOAuth({ provider: 'google' | 'azure' })`; callback at `app/auth/callback/route.ts` exchanges code for session
- **Session management:** `lib/supabase/middleware.ts` refreshes sessions on every request via cookies
- **Middleware:** `middleware.ts` protects `/dashboard/*`, enforces rate limits (100 req/min/IP), validates CSRF on API routes; `/auth/callback` is on the public routes list
- **User roles:** `site_admin`, `tenant_admin`, `user` (stored in `users.role`)
- **Tenant roles:** `admin`, `member` (stored in `tenant_users`)
- **Provider access:** `linksy_provider_contacts` links auth users to providers with `provider_role` (admin/user)
- **Supabase clients:**
  - `lib/supabase/client.ts` — browser singleton (uses anon key, respects RLS)
  - `lib/supabase/server.ts` — `createClient()` for server components, `createServiceClient()` for admin ops (bypasses RLS)

## Module Flags

Feature flags are environment-variable-driven (`NEXT_PUBLIC_ENABLE_*`):

| Flag | Default | Controls |
|------|---------|----------|
| `NEXT_PUBLIC_ENABLE_ACTIVITY_FEED` | `true` | Activity feed feature |
| `NEXT_PUBLIC_ENABLE_FILE_UPLOADS` | `true` | File upload UI |
| `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | `true` | In-app notifications |
| `NEXT_PUBLIC_ENABLE_AUDIT_LOGS` | `true` | Audit log recording |

Module state is also stored in the database and managed via `lib/hooks/useModules.ts`
and the `/dashboard/settings/modules` page.

## Testing

- **No test framework is currently configured.** There are no test files (`*.test.ts`, `*.spec.ts`) in the project.
- **Type checking:** `npm run type-check` (runs `tsc --noEmit`)
- **Linting:** `npm run lint` (ESLint with `eslint-config-next`)
- **Manual verification** is the current approach for feature work.
