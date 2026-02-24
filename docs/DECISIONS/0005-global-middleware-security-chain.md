# 0005 Global Middleware Security Chain

## Date
2026-02-19

## Status
Accepted

## Context

Most API routes are implemented as independent route handlers. Repeating auth/session refresh,
rate limiting, and CSRF checks inside each handler risks inconsistent enforcement.

The project already has:
- Supabase session refresh helper (`lib/supabase/middleware.ts`)
- CSRF validation helper (`lib/middleware/csrf.ts`)
- In-memory rate limiter (`lib/utils/rate-limit.ts`)

## Decision

Enforce a centralized request security chain in `middleware.ts` for matched routes:
1. Refresh Supabase session on every request
2. Apply global API rate limiting (`100` req/min/IP)
3. Apply CSRF checks on state-changing API methods (excluding `/api/public/*`)
4. Enforce route protection for dashboard and non-public routes

## Consequences

- Security rules are consistently applied before route handlers run.
- Route handlers can focus on business logic and role checks (`requireAuth`, `requireTenantAdmin`, etc.).
- The current rate limiter is process-local; multi-instance deployments need a shared store (noted in `lib/utils/rate-limit.ts` and `SECURITY.md`).

## Links
- `middleware.ts`
- `lib/supabase/middleware.ts`
- `lib/middleware/csrf.ts`
- `lib/utils/rate-limit.ts`
