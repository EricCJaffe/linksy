# 9. E2E Testing Strategy with Playwright

Date: 2026-02-24

## Status

Accepted

## Context

The application already had unit tests (Vitest + @testing-library/react) covering utility functions and isolated component behavior. However, critical user flows—especially the public widget embedding, AI search, and referral workflow—required end-to-end validation to ensure integration across frontend, API routes, and database layers.

Key user flows requiring E2E coverage:
1. **Public widget embedding** — crisis detection, AI search, provider selection, interaction tracking
2. **Referral creation** — ticket submission from widget, session linking, email notifications
3. **Admin ticket management** — authenticated dashboard workflows, status updates, email triggers

Challenges:
- Testing public (unauthenticated) flows vs authenticated admin flows
- Validating email delivery without triggering real sends
- Balancing test coverage with CI runtime and maintenance cost
- Handling environment-specific credentials safely

## Decision

We adopted **Playwright** as the E2E testing framework with the following design:

### Framework Selection: Playwright
- **Rationale:** Modern, actively maintained, excellent TypeScript support, cross-browser testing, built-in assertions, trace viewer for debugging
- **Alternatives considered:** Cypress (heavier, less Node.js native), Puppeteer (lower-level, less structured)
- **Config:** `playwright.config.ts` — baseURL set to `http://localhost:3000`, single chromium browser in CI, all browsers available locally

### Test Organization
```
e2e/
├── smoke.spec.ts               # Basic smoke tests (homepage, login, dashboard access)
├── referral-workflow.spec.ts   # Full public → authenticated referral flow
└── helpers/
    └── auth.ts                 # Reusable authenticated session helper
```

### Test Scope
1. **Smoke tests** (`smoke.spec.ts`)
   - Homepage loads
   - Login page renders
   - Dashboard requires auth (redirects unauthenticated users)
   - Fast, catches critical regressions

2. **Referral workflow** (`referral-workflow.spec.ts`)
   - **Public leg:**
     - `/find-help/*` widget page loads
     - Crisis keyword detection displays emergency banner
     - AI search returns provider results
     - Provider cards show contact info
     - Interaction tracking (profile_view) fires
     - Referral ticket submission payload structure
   - **Authenticated leg (env-gated):**
     - Admin login via helper
     - Navigate to ticket detail
     - Update ticket status (exercises email trigger path)
     - Verify status update persists

### Authentication Strategy
- **Helper pattern:** `e2e/helpers/auth.ts` provides `loginAsAdmin()` function
- **Env-gated:** Authenticated tests only run when `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` are set
- **Session reuse:** Playwright's `storageState` caches auth cookies across tests for performance
- **Safety:** Never commit credentials; use GitHub Secrets for CI

### Email Validation Approach
- **Current:** Email trigger code paths are exercised (status update API calls fire email logic)
- **No mailbox assertion yet:** Emails are logged/sent to real SMTP, but not yet captured/asserted
- **Future:** Add MailHog or test inbox integration for full email content validation
- **Note:** Documented in TASKS.md as "Referral workflow e2e (mailbox assertion leg)" pending

### CI Integration
- **Workflow:** `.github/workflows/e2e.yml`
- **Trigger:** Manual dispatch or scheduled (not on every push to avoid flakiness/cost)
- **Environment:** Uses GitHub Secrets for Supabase + admin credentials
- **Isolation:** E2E tests run separately from unit tests to keep main CI fast

### Local Development
- **Commands:**
  - `npm run test:e2e` — headless run
  - `npm run test:e2e:ui` — interactive UI mode for debugging
  - `npm run test:e2e:headed` — see browser during test execution
- **Setup:** Requires `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` in `.env.local` for authenticated tests
- **Trace viewer:** `npx playwright show-trace trace.zip` for post-mortem debugging

## Consequences

### Positive
- Critical user flows are validated end-to-end, catching integration bugs unit tests miss
- Public widget embedding flow (most important user-facing feature) is tested
- Playwright's trace viewer and screenshot capabilities aid debugging
- Authenticated test helper pattern is reusable for future admin workflow tests
- CI can run E2E tests on-demand without slowing down main CI pipeline

### Negative
- E2E tests are slower than unit tests (~15-30s per test vs milliseconds)
- Requires running dev server (`npm run dev`) or build (`npm run build && npm start`) before tests
- Flakiness risk (timing issues, network dependencies) — mitigated by Playwright's built-in waits
- Email content validation requires additional infrastructure (MailHog or test inbox)
- Credential management adds complexity (GitHub Secrets, local `.env.local`)

### Mitigations
- Keep E2E suite small and focused on critical paths only
- Use Playwright's auto-wait and retry mechanisms to reduce flakiness
- Run E2E tests separately from unit tests (manual/scheduled vs on every push)
- Document setup clearly in WORKFLOWS.md and CONTEXT.md
- Plan for MailHog integration to complete email validation loop

## Alternatives Considered

### 1. Cypress
More popular historically, but heavier runtime and less Node.js native. Playwright's TypeScript support and trace viewer tipped the decision.

### 2. Manual QA only
Rejected; critical regressions (especially in widget embedding and crisis detection) are too risky to catch manually.

### 3. Full E2E suite for all features
Rejected as over-testing; unit + integration tests cover most flows. E2E reserved for user-facing critical paths.

## Implementation Notes

- **Baseline:** Smoke test ensures homepage, login, and dashboard work
- **Referral workflow:** Most complex E2E test; exercises public widget → admin dashboard → email notification path
- **Auth helper:** `loginAsAdmin()` returns `storageState` for session reuse across tests
- **Env-gating pattern:** `test.skip(!process.env.E2E_ADMIN_EMAIL, 'Admin credentials not configured')`
- **Future:** Add Playwright component testing for isolated React component E2E (alternative to @testing-library/react for interactive components)

## References

- Playwright config: `playwright.config.ts`
- Test files: `e2e/smoke.spec.ts`, `e2e/referral-workflow.spec.ts`
- Auth helper: `e2e/helpers/auth.ts`
- CI workflow: `.github/workflows/e2e.yml`
- Documentation: `docs/WORKFLOWS.md`, `docs/CONTEXT.md`
- Related: Unit tests use Vitest + @testing-library/react (`__tests__/`)
