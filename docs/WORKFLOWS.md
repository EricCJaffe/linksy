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
- **No test runner configured** — no Jest/Vitest/Playwright in the project

## Supabase

- **Generate types:** `npm run types:generate` (runs `npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > lib/types/database.ts`)
- **Migrations path:** `supabase/migrations/`
- **Config:** `supabase/config.toml` (if present)

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

- No GitHub Actions workflows are currently configured.
