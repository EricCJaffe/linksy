# 0013 Sentry Instrumentation Initialization

## Date
2026-02-26

## Status
Accepted

## Context
The codebase uses `@sentry/nextjs` for observability across browser, server, and edge runtimes. Older docs referenced `sentry.client/server/edge.config.ts`, but the project now initializes Sentry through Next.js instrumentation entry points.

## Decision
Initialize Sentry via:
- `instrumentation.ts` for Node + edge runtime registration
- `instrumentation-client.ts` for browser runtime registration
- `next.config.js` wrapped with `withSentryConfig` for build-time integration and optional source-map upload

Runtime enablement stays env-driven:
- `SENTRY_DSN` for server runtime
- `NEXT_PUBLIC_SENTRY_DSN` for browser/edge runtime
- `SENTRY_AUTH_TOKEN` to enable source map upload in builds

## Consequences
- A single initialization model aligned with current Next.js instrumentation APIs.
- Documentation and operational runbooks must reference instrumentation files, not deleted `sentry.*.config.ts` files.
- Missing DSN values degrade gracefully by disabling Sentry initialization for that runtime.

## Links
- `instrumentation.ts`
- `instrumentation-client.ts`
- `next.config.js`
- `docs/ENVIRONMENT.md`
- `docs/INTEGRATIONS.md`
