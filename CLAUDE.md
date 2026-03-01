# CLAUDE.md — Linksy Project Context

## What is Linksy?

AI-powered community resource search and referral management platform, currently deployed for Clay County, Florida. Residents describe needs in natural language; the system uses vector-similarity search + LLM to find and present relevant local providers (nonprofits, government agencies, faith-based orgs, businesses). Admin dashboard manages providers, referral tickets, needs taxonomy, events, crisis keywords, and host widget configurations.

Built on a generic multi-tenant SaaS template, extended with the Linksy domain layer (`linksy_*` tables, AI search, widget embedding, provider portal).

## Tech Stack

| Layer       | Technology                                                |
|-------------|-----------------------------------------------------------|
| Framework   | Next.js 14 (App Router, React 18)                        |
| Language    | TypeScript 5 (strict mode)                                |
| Database    | Supabase (PostgreSQL + pgvector + PostGIS + pg_trgm)      |
| Auth        | Supabase Auth (cookie-based SSR sessions)                 |
| Storage     | Supabase Storage (`tenant-uploads`, `user-uploads`)       |
| AI          | OpenAI (`text-embedding-3-small`, `gpt-4o-mini`)          |
| Geocoding   | Google Maps Geocoding API                                 |
| Email       | Resend (primary) or SMTP via Nodemailer (fallback)        |
| UI          | Tailwind CSS + Radix UI (shadcn/ui) + Lucide icons        |
| State       | React Query (TanStack Query v5)                           |
| Forms       | React Hook Form + Zod validation                          |
| Deploy      | Vercel (auto-deploys from GitHub)                         |
| Monitoring  | Sentry (optional)                                         |
| Tests       | Vitest (unit) + Playwright (E2E)                          |

## Key Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run type-check       # tsc --noEmit
npm run lint             # ESLint
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run (CI)
npm run test:coverage    # Vitest with v8 coverage
npm run test:e2e         # Playwright headless
npm run test:e2e:headed  # Playwright with browser
npm run test:e2e:ui      # Playwright interactive UI
npm run types:generate   # Supabase type generation → lib/types/database.ts
```

## Project Structure (Key Entry Points)

```
app/layout.tsx                       # Root layout (HTML shell, global providers)
app/providers.tsx                    # React Query provider, Supabase auth listener
middleware.ts                        # Auth session refresh, rate limiting, CSRF, route protection
app/find-help/page.tsx               # Default public widget page
app/find-help/[slug]/page.tsx        # Host-specific embeddable widget
app/api/linksy/search/route.ts       # AI search pipeline (embed → vector → LLM)
app/api/linksy/tickets/route.ts      # Create referral tickets from widget
app/api/linksy/interactions/route.ts # Search session interaction tracking
public/widget.js                     # Embeddable JS snippet for hosts
```

## Routing

**Public:** `/`, `/login`, `/signup`, `/reset-password`, `/find-help`, `/find-help/[slug]`, `/api/public/directory`

**Auth:** `/auth/callback`, `/auth/set-password`, `/invite/[token]`

**Dashboard (protected):** `/dashboard/providers/[id]`, `/dashboard/my-organization`, `/dashboard/tickets/[id]`, `/dashboard/needs`, `/dashboard/admin/crisis`, `/dashboard/admin/reports`, `/dashboard/admin/hosts`, `/dashboard/admin/webhooks`, `/dashboard/admin/email-templates`, `/dashboard/settings/*`

## Auth & Security Model

- **Supabase Auth:** Email/password + Google OAuth + Microsoft (Azure AD) OAuth
- **Session:** Cookie-based SSR via `@supabase/ssr`, refreshed by middleware on every request
- **User roles:** `site_admin`, `tenant_admin`, `user` (in `users.role`)
- **Tenant roles:** `admin`, `member` (in `tenant_users`)
- **Provider access:** `linksy_provider_contacts` links auth users to providers with `provider_role` (admin/user)
- **RLS:** Enforced on all tenant-scoped tables
- **Middleware:** Protects `/dashboard/*`, rate limits (100 req/min/IP), CSRF validation on API mutations
- **Supabase clients:**
  - `lib/supabase/client.ts` — browser singleton (anon key, respects RLS)
  - `lib/supabase/server.ts` → `createClient()` for server components
  - `lib/supabase/server.ts` → `createServiceClient()` for admin ops (bypasses RLS)

## Multi-Tenant Model

- **Site:** Impact Works (top-level platform)
- **Tenants:** Regions (currently `Impact Clay`, `United Way of North Florida` reserved)
- **Providers:** Organizations within a tenant/region
- **Locations:** Physical locations for a provider
- **Parent/Child:** Providers can have parent-child relationships for multi-location orgs

## Database (Supabase)

### Linksy Domain Tables (`linksy_*`)
- `linksy_providers` — provider records + host widget config + embedding + LLM context card
- `linksy_locations` — provider locations with PostGIS geography
- `linksy_needs` / `linksy_need_categories` — needs taxonomy with vector embeddings
- `linksy_provider_needs` — provider-to-need junction
- `linksy_provider_contacts` — staff linked to providers
- `linksy_provider_notes` — activity timeline per provider
- `linksy_tickets` / `linksy_ticket_comments` — referral management
- `linksy_events` — provider events with approval workflow
- `linksy_search_sessions` — AI search tracking
- `linksy_interactions` — click/call/website analytics
- `linksy_crisis_keywords` — crisis detection
- `linksy_webhooks` / `linksy_webhook_deliveries` — outbound webhooks
- `linksy_email_templates` — admin-editable email templates

### Base Template Tables
- `users`, `profiles`, `sites`, `tenants`, `tenant_users`, `modules`, `tenant_modules`, `files`, `audit_logs`, `notifications`

### Ticket Numbering
`R-<sequence>-<suffix>` (e.g. `R-2001-07`). Sequence starts at 2000.

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — **Secret.** Bypasses RLS. Server-only.
- `OPENAI_API_KEY` — AI search and embedding generation

### Recommended
- `NEXT_PUBLIC_APP_URL` — Base URL for invitation/email links
- `NEXT_PUBLIC_SITE_URL` — CSRF allowed-origin list
- `GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Geocoding + static maps
- `ADMIN_EMAIL` — Receives onboarding submissions
- `RESEND_API_KEY` — Email delivery (or SMTP_* vars for fallback)
- `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` — Error tracking

### Tooling
- `SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_REF` — Type generation + CLI
- `SUPABASE_ACCESS_TOKEN` — CLI auth

See `docs/ENVIRONMENT.md` for full list.

## Integrations

- **OpenAI** — AI search pipeline (`text-embedding-3-small` + `gpt-4o-mini`)
- **Google Maps** — Geocoding + static maps
- **Resend / SMTP** — Transactional email (invitations, ticket notifications, status updates)
- **Sentry** — Error tracking (server + client + edge)
- **OpenStreetMap** — Embedded map tiles (free, no auth)
- **Outbound Webhooks** — HMAC-SHA256 signed, tenant-scoped (`ticket.created`, `ticket.status_changed`)

## Conventions

- **Commits:** Conventional Commits (`feat(scope): subject`, `fix(scope): subject`)
- **Code style:** TypeScript strict, functional components, no `any`, Tailwind for styling, `cn()` for conditional classes
- **Imports:** React/Next → external libs → internal components → utils/types
- **Files:** Components PascalCase, utils camelCase, hooks `use*` prefix, API routes lowercase-dash
- **Data fetching:** React Query hooks wrapping `fetch()` calls
- **Forms:** React Hook Form + Zod schemas
- **State:** Server state via React Query, client state via hooks, minimal Context usage
- **Module system:** Data-driven via `modules` + `tenant_modules` tables, not env flags

## Doc Maintenance Rules

- **Major decision** → add ADR in `docs/DECISIONS/`
- **New feature** → add/adjust tasks in `docs/TASKS.md`
- **New integration** → update `docs/INTEGRATIONS.md`
- **New env var** → update `docs/ENVIRONMENT.md`
- **Deployment/workflow change** → update `docs/WORKFLOWS.md`
- **Release notes** → update `docs/RELEASES.md`

## Pre-Commit Checklist

1. `npm run type-check`
2. `npm run lint`
3. `npm run build`

## CI/CD

- GitHub Actions: `.github/workflows/ci.yml` runs type-check + lint + unit tests on push/PR to main
- E2E: `.github/workflows/e2e.yml` (manual trigger)
- Deploy: Vercel auto-deploys from GitHub push

## Key Docs

| Doc | Purpose |
|-----|---------|
| `docs/CONTEXT.md` | Product overview, tech stack, entry points, routing |
| `docs/ARCHITECTURE.md` | System architecture, data model, security, module system |
| `docs/TASKS.md` | Current and pending tasks, MVP alignment, backlog |
| `docs/API.md` | API endpoint reference (Linksy + base template) |
| `docs/ENVIRONMENT.md` | All environment variables |
| `docs/WORKFLOWS.md` | Dev commands, test commands, deploy process |
| `docs/INTEGRATIONS.md` | External APIs and webhook system |
| `docs/SUPABASE.md` | Supabase clients, migrations, RPC functions, tables |
| `docs/RUNBOOK.md` | Common operational issues and fixes |
| `docs/DEPLOYMENT.md` | Full deployment guide (Vercel + Supabase) |
| `docs/RELEASES.md` | Release history |
| `docs/DECISIONS/` | Architecture Decision Records (ADRs) |
| `FEATURES_CHECKLIST.md` | Full feature inventory with completion status |
