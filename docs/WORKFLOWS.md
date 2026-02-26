# Workflows

## Local Dev

- **Install deps:** `npm install`
- **Start dev server:** `npm run dev` (runs `next dev`, default port 3000)
- **Build:** `npm run build` (runs `next build`)
- **Start production server:** `npm start` (runs `next start`)
- **Environment setup:** `cp .env.example .env.local` and fill in values
- **Playwright browser install (first time only):** `npx playwright install --with-deps chromium`

## Type Checking and Lint

- **Type check:** `npm run type-check` (runs `tsc --noEmit`)
- **Lint:** `npm run lint` (runs `next lint` — ESLint)

## Tests

- **Test (watch):** `npm run test` (Vitest)
- **Test (single run):** `npm run test:run`
- **Coverage:** `npm run test:coverage`
- **Config:** `vitest.config.ts`, `vitest.setup.ts`
- **Current tests:** `__tests__/lib/utils/csv.test.ts`, `__tests__/lib/utils/error-handler.test.ts`
- **E2E (headless):** `npm run test:e2e`
- **E2E (headed):** `npm run test:e2e:headed`
- **E2E (UI):** `npm run test:e2e:ui`
- **E2E env requirements:** `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_PROVIDER_ID` (see `e2e/referral-workflow.spec.ts`)
- **Playwright base URL:** `PLAYWRIGHT_BASE_URL` (defaults to `http://127.0.0.1:3000`)
- **Playwright web server behavior:** `playwright.config.ts` starts `next dev` automatically via `webServer.command`; running `npm run dev` separately is optional.

## Supabase

- **Generate types:** `npm run types:generate` (runs `npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > lib/types/database.ts`)
- **Env required for types script:** `SUPABASE_PROJECT_ID` (script name is currently `PROJECT_ID`, not `PROJECT_REF`)
- **CLI auth/link (recommended before migration commands):**
  - `npx supabase login` (or export `SUPABASE_ACCESS_TOKEN`)
  - `npx supabase link --project-ref $SUPABASE_PROJECT_REF`
- **If only `SUPABASE_PROJECT_REF` is set:** `SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_REF npm run types:generate`
- **Migrations path:** `supabase/migrations/`
- **Config:** no `supabase/config.toml` is present in this repo
- **Migration filename rule:** only files matching `<timestamp>_name.sql` are treated as migrations by CLI
- **Useful migration commands:**
  - `supabase migration list`
  - `supabase db push --include-all --yes`
  - `supabase migration repair --status applied <versions...>` (history alignment only; does not execute SQL)
  - `supabase db push --include-all --yes` to apply `20260225223000_region_tenant_model.sql` after tenant refactor

### Migration Hygiene Notes

- Keep ad-hoc/legacy SQL outside `supabase/migrations/` (for example `supabase/_archive/`) to avoid accidental execution attempts.
- If an old non-timestamp migration conflicts with current schema, move it out of `supabase/migrations/` before running `supabase db push`.

## Data / Ops Scripts

- **Initialize context docs:** `bash scripts/init-context.sh`
- **Import migration dataset:** `source .env.local && node scripts/import-migration-data.js`
- **Import contacts only:** `source .env.local && node scripts/import-contacts-only.js`
- **Generate embeddings:** `source .env.local && node scripts/generate-embeddings.js`
- **OAuth config check:** `npx tsx scripts/test-oauth-config.ts`
- **Google OAuth test:** `npx tsx scripts/test-google-oauth.ts`
- **Cleanup test user:** `source .env.local && node scripts/cleanup-test-user.js`
- **Assign providers to Impact Clay tenant (after imports):** run `scripts/backfill-provider-tenants.sql` in Supabase SQL editor

## Deploy

- **Primary deploy path:** Vercel (auto-deploys from GitHub push)
- **Standalone build:** Set `BUILD_STANDALONE=true` for Docker/self-hosted output
- **Required env vars for build:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Build settings:**
  - `typescript.ignoreBuildErrors: false` — TS errors fail the build
  - `eslint.ignoreDuringBuilds: false` — lint errors fail the build
  - `reactStrictMode: true`

## Pre-commit Checklist

1. `npm run type-check` — ensure no TypeScript errors
2. `npm run lint` — ensure no lint errors
3. `npm run build` — ensure production build succeeds

## CI/CD

- GitHub Actions: `.github/workflows/ci.yml`
- Trigger: push + pull_request on `main`
- Steps: `npm ci` → `npm run type-check` → `npm run lint` → `npm run test:run`
- CI note: lint step sets placeholder values for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- E2E workflow: `.github/workflows/e2e.yml` (manual trigger) runs `npm run test:e2e` after installing Playwright browsers.
