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
- `/api/public/directory` — unauthenticated provider directory endpoint

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

Provider Summary tab state (current):
- Contact + address editing is consolidated on Summary.
- `Needs Addressed` uses active taxonomy categories and needs.
- Edit mode supports multi-select category + needs; view mode groups needs under categories.

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

Module access is data-driven (not env-driven in current code):
- Module metadata constants: `lib/constants/modules.ts`
- Runtime module state: `modules` and `tenant_modules` tables (queried by `lib/hooks/useModules.ts`)
- Management UI: `/dashboard/settings/modules`

Note: `.env.example` includes `NEXT_PUBLIC_ENABLE_*` flags, but there are no direct runtime reads of those flags in `app/`, `lib/`, or `components/`.

## Testing

- **Unit tests:** Vitest + @testing-library/react. Config at `vitest.config.ts`, setup at `vitest.setup.ts`.
  - `npm run test` — watch mode
  - `npm run test:run` — single run (used in CI)
  - `npm run test:coverage` — v8 coverage report
  - Test files live under `__tests__/` mirroring `lib/` structure
- **Type checking:** `npm run type-check` (runs `tsc --noEmit`)
- **Linting:** `npm run lint` (ESLint with `eslint-config-next`)
- **CI:** GitHub Actions runs type-check, lint, and tests on every push/PR to main.
