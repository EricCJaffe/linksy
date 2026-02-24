# 0006 Supabase Dual Client Pattern

## Date
2026-02-19

## Status
Accepted

## Context

The app mixes user-scoped operations (must respect RLS and user session) with system/admin
operations (RPCs, imports, admin auth APIs, cross-tenant reports) that require elevated access.

Using a single Supabase client everywhere would either over-privilege normal requests or block
required admin workflows.

## Decision

Use two server-side client constructors:
- `createClient()` in `lib/supabase/server.ts`
  - Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Cookie/session-aware; intended for user-scoped operations
- `createServiceClient()` in `lib/supabase/server.ts`
  - Uses `SUPABASE_SERVICE_ROLE_KEY`
  - Bypasses RLS; used in admin APIs, AI search RPCs, migration/import scripts

Keep browser usage on `lib/supabase/client.ts` (anon key only).

## Consequences

- Clear boundary between least-privilege requests and privileged server workflows.
- Service-key usage must stay server-only and protected by explicit auth checks in route handlers.
- Misuse risk is reduced by centralizing both constructors in one module.

## Links
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `app/api/linksy/search/route.ts`
- `app/api/admin/geocode/route.ts`
- `scripts/import-migration-data.js`
