# Workflows

## Local Dev

- **Install deps:** `npm install`
- **Start dev server:** `npm run dev` (runs `next dev`, default port 3000)
- **Build:** `npm run build` (runs `next build`)
- **Start production server:** `npm start` (runs `next start`)
- **Environment setup:** `cp .env.example .env.local` and fill in values

## Type Checking and Lint

- **Type check:** `npm run type-check` (runs `tsc --noEmit`)
- **Lint:** `npm run lint` (runs `next lint` — ESLint)

## Tests

- **Test (watch):** `npm run test` (Vitest)
- **Test (single run):** `npm run test:run`
- **Coverage:** `npm run test:coverage`
- **Config:** `vitest.config.ts`, `vitest.setup.ts`
- **Current tests:** `__tests__/lib/utils/csv.test.ts`, `__tests__/lib/utils/error-handler.test.ts`

## Supabase

- **Generate types:** `npm run types:generate` (runs `npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > lib/types/database.ts`)
- **Migrations path:** `supabase/migrations/`
- **Config:** no `supabase/config.toml` is present in this repo
- **Migration filename rule:** only files matching `<timestamp>_name.sql` are treated as migrations by CLI
- **Useful migration commands:**
  - `supabase migration list`
  - `supabase db push --include-all --yes`
  - `supabase migration repair --status applied <versions...>` (history alignment only; does not execute SQL)

### Migration Hygiene Notes

- Keep ad-hoc/legacy SQL outside `supabase/migrations/` (for example `supabase/_archive/`) to avoid accidental execution attempts.
- If an old non-timestamp migration conflicts with current schema, move it out of `supabase/migrations/` before running `supabase db push`.

## Data / Ops Scripts

- **Initialize context docs:** `bash scripts/init-context.sh`
- **Import migration dataset:** `source .env.local && node scripts/import-migration-data.js`
- **Import contacts only:** `source .env.local && node scripts/import-contacts-only.js`
- **Generate embeddings:** `source .env.local && node scripts/generate-embeddings.js`

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
