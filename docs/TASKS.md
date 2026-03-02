# Tasks

## Explicit TODO/FIXME Sources (Code + Docs scan)

- [ ] `README.md` roadmap items currently unchecked:
  - Multi-language support (i18n)
  - Billing and subscription management
  - Two-factor authentication (2FA)
  - SSO integration (SAML)
- [ ] No additional explicit `TODO`/`FIXME` markers found in `app/`, `lib/`, `components/`, `scripts/`, `supabase/`, `README.md`, or `docs/` as of 2026-02-26.

## Code Review Findings (2026-03-02)

Full codebase review across API routes, auth/middleware, React components, and data fetching layers. Findings prioritized by severity.

> **Note:** All items below are now tracked in the **Go-Live Roadmap** (below) by phase:
> CRITICAL → Phase 0.1 | HIGH → Phase 0.2 | RLS/DB → Phase 0.3 | MEDIUM → Phase 1.1 | LOW → Phase 2.1

### CRITICAL — Fix Before Next Deploy

- [ ] **XSS: Unsanitized `dangerouslySetInnerHTML`** — `components/ui/rich-text-display.tsx:14-18` and `rich-text-editor.tsx:100` render raw HTML without sanitization (e.g. DOMPurify). Any user-provided HTML (provider descriptions, notes) could execute scripts. **Add DOMPurify or similar.**
- [ ] **Missing `/api/invitations/accept` endpoint** — `app/(auth)/signup/page.tsx:93` and `components/auth/invite-accept-form.tsx:62` POST to `/api/invitations/accept` but this route does not exist. Invitation acceptance is completely broken. **Create the endpoint.**
- [ ] **Open redirect in `/api/auth/callback`** — `app/api/auth/callback/route.ts:14` takes `next` param from query string without validation and redirects to it. Attack: `?next=//evil.com`. **Validate `next` starts with `/` and has no double slashes.**
- [ ] **Race condition in ticket numbering** — `app/api/linksy/tickets/route.ts:112-118` reads ticket count then inserts, allowing duplicate sequence numbers under concurrency. **Use PostgreSQL `nextval()` or an RPC with transactional locking.**

### HIGH — Fix Soon

- [ ] **OpenAI API calls missing error handling** — `app/api/linksy/search/route.ts:117-122` and `:419-435` have no try/catch around OpenAI embedding/chat calls. If the API fails or returns empty data, `embeddingResponse.data[0]` throws. **Wrap in try/catch with user-friendly fallback.**
- [ ] **Hardcoded SITE_ID in multiple routes** — `app/api/linksy/search/route.ts:303` and `tickets/route.ts:39` hardcode `86bd8d01-0dc5-4479-beff-666712654104`. **Move to environment variable.**
- [ ] **Provider API bypasses RLS with no tenant filter** — `app/api/linksy/providers/route.ts:9-58` uses `createServiceClient()` and returns all active providers to any requester. **Filter by tenant; use RLS-respecting client or add tenant check.**
- [ ] **Open redirect in login form** — `components/auth/login-form.tsx:44,125` takes `redirect` param from search params without validation. **Validate it's a relative path.**
- [ ] **Non-admin users can set `is_private` on comments** — `app/api/tickets/[id]/comments/route.ts` POST blindly accepts `is_private` from body. **Server should enforce: only site_admin can set `is_private: true`.**
- [ ] **Merge operation has no transaction/rollback** — `app/api/admin/providers/merge/route.ts:74-195` logs errors on location/contact moves but continues, potentially leaving orphaned records. **Fail fast on first error or wrap in a transaction.**

### MEDIUM — Address When Possible

- [ ] **Crisis keyword test endpoint has no auth** — `app/api/crisis-keywords/test/route.ts` accepts arbitrary POST input with no authentication. **Add auth check.**
- [ ] **`setTimeout` not cleaned up in find-help** — `app/find-help/page.tsx:258-277` sets a 5-second timeout for crisis banner dismissability with no cleanup on unmount. **Use `useEffect` with `clearTimeout`.**
- [ ] **Search bar missing AbortController** — `components/shared/search-bar.tsx:40-64` fetch in useEffect doesn't abort on unmount/query change. **Add AbortController.**
- [ ] **Notification subscription not tenant-scoped** — `lib/hooks/useNotifications.ts:54-72` subscribes to all `notifications` inserts without user/tenant filter. **Filter by `user_id`.**
- [ ] **In-memory rate limiter ineffective on Vercel** — `lib/utils/rate-limit.ts` stores state in-memory per instance. On multi-instance Vercel, limits don't work. **Use Upstash Redis for production.**
- [ ] **Activity logging uses browser client** — `lib/utils/activity.ts:35` calls `createClient()` (browser, RLS-bound) to insert audit logs. If user lacks insert permission, logs silently fail. **Use server-side service client.**
- [ ] **`parseInt` NaN not handled** — `app/api/support-tickets/route.ts:15-16` and other routes don't guard against `NaN` from non-numeric query params. **Add `|| defaultValue` fallback.**
- [ ] **Unsafe `any` types in hooks** — `useCurrentTenant.ts:53,61,71-74`, `find-help/page.tsx:334` use `any` for membership/provider data. **Create proper interfaces.**
- [ ] **Missing staleTime/gcTime on queries** — `lib/hooks/useModules.ts` and others have no React Query cache config, causing unnecessary refetches. **Add reasonable staleTime.**
- [ ] **Error response info disclosure** — Multiple routes (e.g. `app/api/invitations/route.ts:76`) return `validation.error.flatten()` exposing schema details. **Return generic messages; log details server-side.**
- [ ] **CSRF allows `http://` origin in production** — `lib/middleware/csrf.ts:34-36` includes `http://${host}` in allowed origins. **Only allow HTTP in development.**

### LOW — Backlog

- [ ] **Array index used as React key** — 15+ instances across `find-help/page.tsx:464`, `find-help-widget.tsx:339`, `search-results.tsx:52`, ticket/admin pages. Causes state bugs on reorder/filter.
- [ ] **Silent `.catch(() => {})` swallowing errors** — `find-help-widget.tsx:213`, `provider-detail-tabs.tsx:676,685,761`, `statistics-tab.tsx:17,274`. Failures are invisible.
- [ ] **`alert()` used for errors** — `components/providers/call-log-form.tsx:59-102` uses `alert()` instead of toast notifications.
- [ ] **Environment variables not validated at startup** — `lib/utils/email.ts`, `lib/supabase/client.ts` use `!` non-null assertions with no runtime check. App silently breaks if vars missing.
- [ ] **Sensitive logging in set-password page** — `app/auth/set-password/page.tsx` logs token availability to browser console. **Remove for production.**
- [ ] **File upload paths use `Date.now()` + UUID** — `app/api/providers/[id]/notes/upload/route.ts:67-68`, `app/api/files/upload/route.ts:73-76`. The timestamp is unnecessary given UUID. No filename length limit.
- [ ] **CSV export no error handling** — `lib/api/audit-logs.ts:60-64` `exportAuditLogsToCSV` has no try/catch.
- [ ] **Missing null check** — `lib/hooks/useProviderPermissions.ts:34-35` assumes `provider.contacts` exists without `?.`.

## Session Snapshot (2026-03-02)

### Completed Today
- [x] Fixed ESLint config: removed `next/typescript` extend (Next 15-only, not available in Next 14); lint now loads cleanly
- [x] Fixed Sentry `global-error.tsx` styling: added `globals.css` import + Tailwind classes + `reset` prop so error boundary no longer breaks all page styling
- [x] Fixed all ~40 `react/no-unescaped-entities` lint errors across 20 files; added `"warn"` rule as CI safety net
- [x] Fixed `jsx-a11y/alt-text` false positive in `file-upload.tsx` (renamed Lucide `Image` to `ImageIcon`)
- [x] Fixed `handleSelect` missing `useCallback` dep in `search-bar.tsx`
- [x] Removed 3 debug `console.log` statements from `middleware.ts` auth redirect paths
- [x] Fixed 8 `react-hooks/exhaustive-deps` warnings: moved fetch functions inside `useEffect` or wrapped in `useCallback` (review-imports, support, dashboard, reports, survey, aging-referrals, support-tickets-tab)
- [x] Removed 3 dead code files (160 LOC): `components/ui/accordion.tsx`, `lib/hooks/useSla.ts`, `lib/constants/routes.ts`
- [x] Lint warnings reduced from 40+ errors → 0 errors, 10 warnings (6x `no-img-element`, 4x cascading deps)

## Session Snapshot (2026-02-23)

### Completed Today
- [x] Summary page `Needs Addressed` is now taxonomy-driven: multi-select categories + underlying needs in edit mode, grouped category/need display in view mode (providers + provider portal review)
- [x] Needs taxonomy admin page defaults to active categories, with explicit toggle for inactive
- [x] Legacy/duplicate inactive need categories were remapped to active AIRS categories and cleaned up via migration
- [x] Provider notes flow stabilized: create/update compatibility fixes, author display, pin/copy/edit/delete actions, and attachment upload path fixed
- [x] Referral status color coding standardized across referrals management and provider-level referrals views
- [x] Provider summary expanded with contact preference controls and UI color cues for key status fields
- [x] Support ticket entry point moved to top-right action pattern; provider-side support tab removed from provider detail navigation

### Pending (Prioritized)
- [x] Finalize `Needs` vs `Needs Addressed` final placement/labels after stakeholder review (taxonomy UI shipped, naming/placement decision still pending) — COMPLETED 2026-02-25
- [x] Parent/child account linking model — Sprint 1 (Database + Security) COMPLETE (2026-02-24)
- [x] Parent/child account linking model — Sprint 2 (Basic UI) COMPLETE (2026-02-24)
- [x] Parent/child account linking model — Sprint 3 (Dashboard + Reporting) COMPLETE (2026-02-24)
- [x] Parent/child account linking model — Sprint 4 (Polish + UX) COMPLETE (2026-02-24)
- [x] Webhooks admin smoke validation in live/staging target (create/test endpoint, signature validation, retry/history checks) — COMPLETED 2026-02-25
- [ ] Referral workflow e2e mailbox assertion leg (outbound email content/delivery verification)
- [x] Tenant model refactor: move from provider-as-tenant to region tenants (Impact Works site, Impact Clay tenant, add United Way of North Florida tenant) — COMPLETED 2026-03-01
  - Fixed remote_schema migration (20260225204403) that was dropping `tenant_id` column/FK/indexes needed by region model
  - Fixed auth middleware `.maybeSingle()` to prefer region tenants when user has multiple memberships
  - Webhook dispatch now resolves tenant_id from provider record (not just auth context)
- [x] Apply migration `20260225223000_region_tenant_model.sql` — APPLIED 2026-03-02
- [x] Run `scripts/backfill-provider-tenants.sql` — APPLIED 2026-03-02 (66/66 contacts backfilled)
- [ ] **TEST**: Log in as a provider user and verify `/dashboard/my-tickets` shows their referrals (no longer "No referrals found")
- [x] Verify tenant UI and webhooks scoped to Impact Clay — COMPLETED 2026-03-01
  - Webhook UI (`useCurrentTenant`) correctly filters to `type='region'` tenants
  - All ticket webhook dispatch routes now resolve tenant_id from `linksy_providers.tenant_id`
- [ ] Webhook event coverage: verify `ticket.assigned`, `ticket.forwarded`, `ticket.reassigned`
- [x] Provider user sees "No referrals found" — COMPLETED 2026-03-01
  - Root cause: auth middleware `.maybeSingle()` silently returned null when user had multiple tenant memberships
  - Root cause: `/api/tickets` GET had no server-side provider access validation — used service client bypassing RLS
  - Fix: tickets API now enforces provider access for non-admin users via `linksy_provider_contacts`
  - Fix: single-ticket GET endpoint now validates provider access via `linksy_user_can_access_provider` RPC

## MVP Alignment (Reviewed 2026-02-23)

### Confirmed Complete
- [x] Database + chatbot baseline is live (AI search pipeline + provider/ticket schema in production flow)
- [x] Accept/deny controls for new organization applications (admin review + approve/reject)
- [x] Note date/time stamps in provider timeline and notes views
- [x] Org Needs categories on provider Summary page (taxonomy-driven category + need selection/display)
- [x] Duplicate referral guard for same client/provider/need window
- [x] ZIP code + provider services matching logic in search pipeline

### Confirmed Requirements (Still Open)
- [x] Merge contacts (dedup + merge workflow for provider contacts) — COMPLETED 2026-02-24
- [x] Bulk import approval flagging: imported records should be reviewable/approvable before full activation — COMPLETED 2026-02-24
- [x] Referral pending aging notifications: alert/escalation when pending referrals exceed configured age — COMPLETED 2026-02-24
- [x] Bulk referral status update with automatic client/provider email notifications — COMPLETED 2026-02-24
- [x] Auto-reroute option when provider cannot help — COMPLETED 2026-02-25
- [x] Referral cap per client: enforce maximum of 4 referrals (replace current broader limit behavior) — COMPLETED 2026-02-24
- [x] Provider service ZIP coverage field: allow providers/admins to define supported ZIP codes and exclude referrals outside that coverage — COMPLETED 2026-02-24
- [x] Provider phone extension field (UI + DB schema + API support) — COMPLETED 2026-02-24

### Provider Portal / Notes Enhancements (Open)
- [x] Add call log as a provider note-type option (structured call details attached to notes flow) — COMPLETED 2026-02-24

### Phase 2 / 3 Still Open
- [ ] Autoupdates for description every 90 days with explicit override behavior
- [ ] Enhanced notification workflows beyond current baseline notifications
- [ ] Host-specific email template customization (tenant/host-level overrides for outbound referral/proposal communications)
- [ ] Host custom form builder for pre-proposal intake (configurable extra questions before proposal/referral submission)
- [ ] Custom provider referral redirects (external destination behavior + strategy/pricing decision)
- [ ] Host filtering by needs/category in admin hosts workflow
- [ ] Chatbot card view support for non-referral providers
- [ ] Advanced workflow verification engine
- [ ] Stronger anti-spam logic for client-to-provider interactions beyond current rate/duplicate guards
- [ ] Microphone input for chatbot
- [ ] Multilingual support

## Active

### Data Management
- [x] Merge contact function — ability to merge duplicate contacts into a single record (dedup provider contacts) — COMPLETED 2026-02-24
- [x] Merge provider function — ability to merge duplicate providers with comprehensive data transfer — COMPLETED 2026-02-24
- [x] Purge provider function — ability to permanently delete a provider and all associated records (locations, contacts, needs, tickets, notes, events) — COMPLETED 2026-02-24
- [x] Finalize `Needs` vs `Needs Addressed` placement — review the Summary page + Notes/Referrals context and lock final field locations/labels so data entry flow is unambiguous — COMPLETED 2026-02-25

### Parent/Child Linking Model
- [x] Sprint 1: Database + Security (COMPLETED 2026-02-24)
  - ✅ Migration with parent_provider_id, audit columns, indexes, constraints
  - ✅ Database helper functions: linksy_get_child_provider_ids(), linksy_user_can_access_provider()
  - ✅ TypeScript types: ProviderHierarchy, ParentOrgStats, ProviderAccessInfo, ProviderAccessLevel
  - ✅ Updated /api/provider-access to include children in accessibleProviderIds
  - ✅ Access control in provider detail/locations/notes endpoints via RPC function
  - ✅ API endpoints: POST /api/admin/providers/[id]/set-parent, GET /api/providers/[id]/children, GET /api/providers/[id]/hierarchy
  - ✅ React Query hooks: useProviderHierarchy, useProviderChildren, useSetParentProvider
- [x] Sprint 2: Basic UI (COMPLETED 2026-02-24)
  - ✅ ParentChildManager component with link/unlink dialogs (search parent, confirm unlink)
  - ✅ Integrated into provider Summary tab (visible to all, admin controls for site_admin only)
  - ✅ Displays parent organization with link to parent detail page
  - ✅ Displays child locations list with status badges and location counts
  - ✅ Organization type filter in providers list (all/parent/child/standalone)
  - ✅ Child location badge indicator in providers table
  - ✅ API support for organization_type filtering with post-query parent/standalone detection
- [x] Sprint 3: Dashboard + Reporting (COMPLETED 2026-02-24)
  - ✅ API endpoint GET /api/providers/[id]/parent-stats with date range filtering
  - ✅ Aggregated metrics across parent + all children (referrals, interactions, events, notes, locations)
  - ✅ ParentOrgDashboard component with summary cards, engagement breakdown, and performance table
  - ✅ Per-child breakdown table with drill-down links to each location
  - ✅ Date range filters (from/to) with apply/clear controls and auto-refresh
  - ✅ Dedicated "Organization Dashboard" tab in provider detail (only visible for parent orgs)
  - ✅ useParentOrgStats hook with query invalidation support
  - ✅ Parent stats row + totals row in breakdown table for complete visibility
- [x] Sprint 4: Polish + UX (COMPLETED 2026-02-24)
  - ✅ Bulk operations for child sites from Organization Dashboard table
    - ✅ Checkbox selection with "Select All" toggle
    - ✅ Bulk activate/deactivate/pause actions
    - ✅ Parallel API calls with Promise.all()
    - ✅ Auto-refresh and query invalidation after bulk operations
  - ✅ Navigation improvements
    - ✅ ProviderBreadcrumbs component showing parent > child hierarchy
    - ✅ ProviderQuickSwitcher dropdown to jump between parent and all children
    - ✅ Integrated into provider detail page header
  - ✅ Documentation
    - ✅ Comprehensive user guide (docs/GUIDES/parent-child-organizations.md)
    - ✅ FEATURES_CHECKLIST.md updated with all parent/child features marked complete
    - ✅ Sections: Overview, For Site Admins, For Parent Admins, For Provider Staff, Best Practices, Troubleshooting

## Backlog

### Testing
- [ ] Referral workflow e2e (mailbox assertion leg) — outbound email delivery/content assertions still need mailbox capture strategy (MailHog/test inbox); status-update trigger path is now covered in Playwright
- [x] Webhooks admin UI smoke validation — create webhook in `/dashboard/admin/webhooks`, run `Test`, verify signed headers/payload at receiver, confirm delivery history filters/pagination and secret reveal/copy/rotate behavior — COMPLETED 2026-02-25

### Widget / Embed
- [x] Fix iframe cross-origin embedding — `/find-help/*` now overrides `X-Frame-Options` and sets `frame-ancestors *` CSP; all other routes keep `SAMEORIGIN`
- [x] `host_allowed_domains` enforcement — `linksy_resolve_host` RPC updated to return `allowed_domains`; checked in `find-help/[slug]/page.tsx` against `Referer` header; direct navigation always allowed
- [x] JavaScript embed snippet — `public/widget.js`; reads `data-slug`, derives base URL from script `src`, injects responsive iframe with `allow="geolocation"`

### Authentication
- [x] Finalize Microsoft OAuth — verify Azure AD app registration, test login flow end-to-end, confirm callback handling and role assignment
- [x] Finalize Google OAuth — verify Google Cloud Console setup, test login flow end-to-end, confirm callback handling and role assignment

### Provider Portal (Phase 2)

### Infrastructure
- [x] ESLint config fix + JSX entity cleanup + dead code removal — COMPLETED 2026-03-02
- [x] Sentry `global-error.tsx` styling fix — COMPLETED 2026-03-02
- [x] `useEffect` exhaustive-deps cleanup (8 warnings) — COMPLETED 2026-03-02
- [x] Middleware debug log removal — COMPLETED 2026-03-02

---

## Go-Live Roadmap

Organized into phases. Everything in Phase 0–2 must be completed or have a clear workaround before public launch.

### Phase 0 — Critical Security & Data (Blockers)

These must be resolved first. Security issues block go-live; data issues block user acceptance.

#### 0.1 CRITICAL Security Fixes (from [Audit 2026-03-02](AUDIT-2026-03-02.md))

All four are exploitable in production. Must fix before any public traffic.

- [ ] **XSS: Unsanitized `dangerouslySetInnerHTML`** — `rich-text-display.tsx:14-18` and `rich-text-editor.tsx:100` render raw HTML. Add DOMPurify.
- [ ] **Missing `/api/invitations/accept` endpoint** — Invitation acceptance is completely broken. Create the endpoint.
- [ ] **Open redirect in `/api/auth/callback`** — `next` param not validated. Validate starts with `/`, no double slashes.
- [ ] **Race condition in ticket numbering** — Read-then-insert allows duplicate `R-xxxx` numbers. Use `nextval()` or RPC with transactional lock.

#### 0.2 HIGH Security Fixes (from [Audit 2026-03-02](AUDIT-2026-03-02.md))

Serious risks that could cause data leaks or auth bypass. Fix before go-live.

- [ ] **OpenAI API calls missing error handling** — `search/route.ts:117-122` and `:419-435` have no try/catch. Add with user-friendly fallback.
- [ ] **Hardcoded SITE_ID** — `search/route.ts:303` and `tickets/route.ts:39` hardcode UUID. Move to env var.
- [ ] **Provider API bypasses RLS** — `providers/route.ts` uses `createServiceClient()`, returns all providers to any requester. Add tenant filter.
- [ ] **Open redirect in login form** — `login-form.tsx:44,125` takes unvalidated `redirect` param. Validate relative path.
- [ ] **Non-admin users can set `is_private` on comments** — `tickets/[id]/comments/route.ts` blindly accepts from body. Enforce server-side.
- [ ] **Merge operation has no transaction/rollback** — `providers/merge/route.ts` continues on error. Wrap in transaction or fail fast.

#### 0.3 RLS / Database Security Fixes (from [Audit 2026-03-02](AUDIT-2026-03-02.md) §RLS Security Audit)

These are database-level access control gaps. Not yet tracked elsewhere.

- [ ] **HIGH: `linksy_provider_contacts` — RLS disabled entirely.** Auth handled at API layer only. Any direct Supabase client (or future endpoint mistake) exposes all contacts. **Re-enable RLS with provider-scoped policies.**
- [ ] **HIGH: `linksy_provider_notes` — `is_private` not enforced at RLS level.** Private notes could leak to non-admin provider staff if app filtering is bypassed. **Add `is_private = false` condition for non-admin reads.**
- [ ] **MEDIUM: `linksy_tickets` — No client-view policy.** Clients who submitted referrals via widget cannot query their own ticket status. **Add email-based client view policy.**
- [ ] **MEDIUM: `linksy_call_logs` — Overly permissive.** Any authenticated user can manage any call log. **Scope to provider contacts for their own provider's tickets.**
- [ ] **MEDIUM: `linksy_custom_fields` — Unscoped.** Any authenticated user can manage any provider's custom fields. **Scope like `linksy_host_custom_fields`.**
- [ ] **MEDIUM: `linksy_surveys` — Unrestricted UPDATE.** Any authenticated user can modify any survey result. **Restrict to survey owner or admin.**
- [ ] **LOW: `linksy_search_sessions` — Anon update has no row filter.** One session could modify another. **Add `id = session_id` filter.**

#### 0.4 User Migration Strategy
- [ ] **Design auth migration plan for existing users** — Current state: ~167+ users exist in Supabase with usernames in the `user_id` field and are listed as `linksy_provider_contacts`, but **none have passwords set**. They cannot log in. **Note:** Fixing the missing `/api/invitations/accept` endpoint (0.1) is a prerequisite for any invite-based migration flow. Options to evaluate:
  - **(a) Magic link / passwordless invite flow** — Send each user a one-time email link that creates their Supabase Auth session and prompts them to set a password. Leverages existing `/invite/[token]` and `/auth/set-password` infrastructure.
  - **(b) Bulk password-reset emails** — Use Supabase Admin API to trigger `resetPasswordForEmail()` for every migrated user. Simpler but requires valid email addresses on file.
  - **(c) First-login password creation** — Allow users to “claim” their account by verifying email + setting password on first visit (similar to (a) but self-service, no admin trigger).
  - **Decision needed:** Which approach? Does every contact need login access, or only primary contacts?
- [ ] Audit `linksy_provider_contacts` to confirm which contacts have valid `user_id` references in `auth.users`
- [ ] Audit email addresses — ensure all contacts who need access have valid, deliverable emails
- [ ] Build or adapt bulk invite script (likely extends existing `/api/invitations` flow)
- [ ] Test migration flow end-to-end with a small batch before full rollout
- [ ] Document rollout communication plan (what email do users receive, what do they do)

#### 0.5 Data Migration & Import (Pre-Go-Live Sync)
- [ ] **Build/utilize import function to bring system up to date** — The initial Power Apps → Supabase migration is done (providers, needs, tickets imported), but production data has continued accumulating in the legacy system. Need to:
  - Identify delta: new providers, updated contacts, new referrals since last import
  - Build incremental import script (or re-run full import with upsert logic)
  - Reconcile any manual edits made in Linksy with legacy source-of-truth
  - Run final sync as close to go-live as possible (ideally same-day cutover)
- [ ] Verify all provider embeddings and LLM context cards are generated for new/updated providers
- [ ] Verify geocoding is complete for all locations
- [ ] Final QA pass: spot-check 10+ providers for data accuracy (name, phone, address, needs)

#### 0.6 Template Email Data
- [ ] **Collect and configure all email template content** — The `linksy_email_templates` system exists but needs production-ready copy for:
  - New referral notification (to provider)
  - Referral status update (to client)
  - Provider invitation / welcome email
  - User migration / account claim email (ties to 0.1)
  - Ticket comment notification
  - Any host-specific template overrides
- [ ] Get final copy from stakeholders (Impact Clay branding, tone, legal disclaimers)
- [ ] Load templates into `linksy_email_templates` table via admin UI or migration script

#### 0.7 Email & Domain Setup (Impact Works)
- [ ] **Email implications of new Impact Works domain** — Decisions needed:
  - Which domain? (e.g., `impactworks.org`, `impactworks.com`, `impactworks.app`)
  - SPF/DKIM/DMARC records for transactional email (Resend) — required for deliverability
  - Who needs `@impactworks` email addresses? (Eric, admins, support inbox)
  - Set up shared/alias inboxes (e.g., `support@`, `referrals@`, `noreply@`)
  - Update `ADMIN_EMAIL` env var and Resend sender domain
  - Update `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` for the production domain
- [ ] Configure DNS records (Vercel custom domain + email DNS)
- [ ] Verify Resend domain authentication (SPF, DKIM, DMARC)

### Phase 1 — Feature Completion & Hardening (Pre-Go-Live)

Core features that users and admins need on day one, plus stability/quality fixes.

#### 1.1 MEDIUM Code Quality Fixes (from [Audit 2026-03-02](AUDIT-2026-03-02.md))

Not security-critical but cause reliability issues, data leaks, or poor UX in production.

- [ ] **Crisis keyword test endpoint has no auth** — `crisis-keywords/test/route.ts` accepts unauthenticated POST. Add auth check.
- [ ] **`setTimeout` not cleaned up in find-help** — `find-help/page.tsx:258-277`. Use `useEffect` with `clearTimeout`.
- [ ] **Search bar missing AbortController** — `search-bar.tsx:40-64` fetch doesn't abort on unmount/query change.
- [ ] **Notification subscription not tenant-scoped** — `useNotifications.ts:54-72` subscribes to all inserts. Filter by `user_id`.
- [ ] **In-memory rate limiter ineffective on Vercel** — `rate-limit.ts` stores state per-instance. Use Upstash Redis for production.
- [ ] **Activity logging uses browser client** — `activity.ts:35` uses RLS-bound client. Logs silently fail if user lacks permission. Use server-side service client.
- [ ] **`parseInt` NaN not handled** — `support-tickets/route.ts:15-16` and other routes. Add `|| defaultValue` fallback.
- [ ] **Unsafe `any` types in hooks** — `useCurrentTenant.ts`, `find-help/page.tsx:334`. Create proper interfaces.
- [ ] **Error response info disclosure** — Multiple routes return `validation.error.flatten()`. Return generic messages; log server-side.
- [ ] **CSRF allows `http://` origin in production** — `csrf.ts:34-36`. Only allow HTTP in development.

#### 1.2 Reassign Referral to Another Provider
- [ ] **Verify “reassign to other provider” feature is working** — Auto-reroute was completed 2026-02-25 (provider can flag “unable to assist” → system offers reassignment). Need to:
  - End-to-end test: create referral → provider marks unable to assist → admin reassigns to new provider
  - Verify the new provider receives notification email
  - Verify ticket history/comments reflect the reassignment
  - Verify `ticket.reassigned` webhook fires correctly
  - Test from provider portal view (not just admin)

#### 1.3 Events Visibility for End Users
- [ ] **Decide where event page/list appears for public users** — Options:
  - **(a) In the chatbot results** — When a user searches a need, show relevant upcoming events alongside providers
  - **(b) Dedicated `/events` public page** — Standalone calendar/list page linked from nav or widget
  - **(c) On the public provider directory** — Events shown on each provider's public profile
  - **(d) Combination** — Show in chatbot results AND a dedicated page
  - **Decision needed:** Which approach? Does this vary by host?
- [ ] Implement chosen approach
- [ ] Ensure events respect approval status (only `published` events shown publicly)

#### 1.4 AI Search Includes Events
- [ ] **Extend AI search pipeline to include event listings** — Currently searches only provider services/needs. Need to:
  - Include upcoming published events in the vector search or as supplemental results
  - Add event data to LLM context (event name, date, time, location, description, provider)
  - Generate embeddings for events (or match events to needs via `linksy_provider_needs`)
  - LLM should mention relevant events naturally (e.g., “They also have a food distribution event this Saturday...”)
  - Filter to future events only (no past events in results)
- [ ] Update search API response to include event cards alongside provider cards
- [ ] Widget UI: display event result cards with date, time, location, and registration link

#### 1.5 Host Danger Word Filtering
- [ ] **Verify host ability to filter crisis/danger words** — System currently has global `linksy_crisis_keywords` with detection + emergency banners. Need to verify:
  - Hosts can see crisis detection working in their embedded widget
  - Confirm crisis keywords are comprehensive (review current list with stakeholders)
  - Test: type a crisis keyword in a host-embedded widget → emergency banner appears
  - Determine if hosts need per-host keyword customization (beyond global list)
  - Document for hosts how the safety system works

#### 1.6 Reporting Features
- [ ] **Design and build reporting features** — Analytics dashboard exists with search, provider, crisis, widget, and ticket tabs. Evaluate gaps:
  - Admin-facing reports: referral volume by provider/need/time period, provider response times, aging referrals
  - Exportable reports (CSV/PDF) for board meetings and funders
  - Scheduled report emails (weekly/monthly digest to admin)
  - Provider-facing reports: their own referral stats, response time metrics
  - Host-facing reports: widget usage, search volume, top needs
  - Funder/grant reporting: aggregate impact metrics (people served, referrals completed, needs addressed)
- [ ] Prioritize which reports are needed for go-live vs. post-launch
- [ ] Build priority reports

### Phase 2 — Business Operations & Polish (Go-Live Adjacent)

Needed for sustainability but not blocking initial launch if timeline is tight.

#### 2.1 LOW Code Quality Fixes (from [Audit 2026-03-02](AUDIT-2026-03-02.md))

Won't block launch but improve reliability and developer experience.

- [ ] **Array index used as React key** — 15+ instances across find-help, widget, ticket pages. Causes state bugs on reorder/filter.
- [ ] **Silent `.catch(() => {})` swallowing errors** — `find-help-widget.tsx:213`, `provider-detail-tabs.tsx`, `statistics-tab.tsx`. Failures invisible.
- [ ] **`alert()` used for errors** — `call-log-form.tsx:59-102`. Replace with toast notifications.
- [ ] **Environment variables not validated at startup** — `email.ts`, `client.ts` use `!` assertions. Add runtime check.
- [ ] **Sensitive logging in set-password page** — `set-password/page.tsx` logs token availability to console. Remove.
- [ ] **File upload paths use `Date.now()` + UUID** — Timestamp unnecessary given UUID. No filename length limit.
- [ ] **CSV export no error handling** — `audit-logs.ts:60-64`. Add try/catch.
- [ ] **Missing null check** — `useProviderPermissions.ts:34-35` assumes `provider.contacts` exists. Add `?.`.

#### 2.2 Public-Facing Impact Works Website
- [ ] **Set up the public Impact Works website** — Decisions needed:
  - Separate marketing site (e.g., WordPress/Webflow at `impactworks.org`) vs. enhanced Linksy landing page at `/`?
  - Content needed: mission statement, about us, for providers (onboarding CTA), for communities (find help CTA), pricing/plans, contact
  - Design: brand guidelines, logo, color palette for Impact Works (vs. Impact Clay sub-brand)
  - SEO: meta tags, Open Graph, sitemap
- [ ] Build or configure the chosen approach
- [ ] Set up analytics (Google Analytics / Plausible)

#### 2.3 Stripe Integration — Monthly Recurring Billing
- [ ] **Incorporate Stripe for subscription billing** — The base template has a placeholder for billing. Need to:
  - Set up Stripe account and API keys
  - Define pricing tiers (per-host? per-tenant? per-provider? flat fee + usage?)
  - Implement Stripe Checkout for onboarding / subscription start
  - Implement Stripe Customer Portal for self-service billing management
  - Webhook handler for `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Link subscription status to host/tenant `is_active` and feature access
  - Grace period logic for failed payments
  - Admin UI: view subscription status, revenue dashboard
- [ ] Set up Stripe test environment and test full lifecycle (subscribe → invoice → pay → cancel)

#### 2.4 QuickBooks Integration
- [ ] **Ability to integrate with QuickBooks** — For Impact Works financial management:
  - Evaluate: QuickBooks Online API vs. third-party connector (e.g., Zapier, Make)
  - Sync Stripe invoices/payments → QuickBooks as income entries
  - Map customers (tenants/hosts) to QuickBooks customer records
  - Recurring subscription revenue recognition
  - Determine scope: read-only reporting, or two-way sync?
- [ ] Choose integration approach and implement

### Phase 3 — Compliance & Scale (Post-Launch Priority)

#### 3.1 HIPAA-Level Capacity
- [ ] **Evaluate and implement HIPAA compliance measures** — Linksy handles referral data that may include protected health information (PHI). Need to:
  - **Audit current data handling**: What PHI flows through the system? (client names, contact info, health-related needs, referral details)
  - **Supabase**: Confirm Supabase project is on a HIPAA-eligible plan; execute BAA (Business Associate Agreement) with Supabase
  - **Vercel**: Evaluate Vercel's HIPAA compliance posture; may need Vercel Enterprise or alternative hosting
  - **OpenAI**: Execute BAA with OpenAI (available on Enterprise tier); evaluate if PHI is sent to LLM (currently client queries may contain health info)
  - **Resend/Email**: Ensure email provider supports BAA; transactional emails may contain PHI
  - **Encryption**: Verify encryption at rest and in transit for all PHI fields
  - **Access controls**: Audit that RLS properly restricts PHI to authorized users only
  - **Audit logging**: Ensure all PHI access is logged (existing `audit_logs` table may need expansion)
  - **Data retention**: Define and enforce retention policies for search sessions, tickets, client data
  - **Staff training**: Document data handling procedures
  - **BAA cascade**: Ensure all sub-processors (Supabase, Vercel, OpenAI, Resend, Google Maps) have BAAs in place
- [ ] Engage compliance consultant if needed for formal HIPAA risk assessment
- [ ] Document compliance posture and any limitations

### Phase 4 (Deferred / Post-Launch)

- [ ] Voice input (Whisper) in widget (`/api/linksy/transcribe` + widget mic UX)
- [ ] Microphone input for chatbot
- [ ] Spanish (es) language support (duplicates README “Multi-language support (i18n)” item)
- [ ] Multi-language support (i18n) — README roadmap item (covers Spanish language support)
- [ ] Two-factor authentication (2FA) — README roadmap item (covers admin TOTP)
- [ ] SSO integration (SAML) (README roadmap item)

## Done

- [x] Parent/child provider linking - Sprint 4 (Polish + UX) (2026-02-24) — Production-ready polish for multi-location organizations: bulk operations in Organization Dashboard table with checkbox selection (select all toggle), bulk activate/deactivate/pause actions using parallel API calls, auto-refresh after operations; ProviderBreadcrumbs component showing "Parent Org > Child Name" hierarchy with links; ProviderQuickSwitcher dropdown menu in provider detail header for instant navigation between all locations (parent + children) with current location highlighting; comprehensive user guide (docs/GUIDES/parent-child-organizations.md) covering admin workflows, parent admin features, staff access, best practices, troubleshooting, and technical notes; FEATURES_CHECKLIST.md fully updated with all parent/child features marked complete in Provider Management section
- [x] Parent/child provider linking - Sprint 3 (Dashboard + Reporting) (2026-02-24) — Aggregated reporting for parent organizations: API endpoint GET /api/providers/[id]/parent-stats with date range filtering (date_from, date_to); aggregates referrals, interactions (profile views, phone/website/directions clicks), events, notes, locations across parent + all children; ParentOrgDashboard component with summary cards (locations, referrals, interactions, events), engagement breakdown (4 interaction types with icons), additional metrics (notes, physical locations), and performance breakdown table showing parent + each child + totals row; date range filter UI with apply/clear/refresh controls; dedicated "Organization Dashboard" tab in provider detail (only visible for parent orgs with children); useParentOrgStats React Query hook; drill-down links from each row to provider detail pages
- [x] Parent/child provider linking - Sprint 2 (Basic UI) (2026-02-24) — Complete UI for managing parent/child relationships: ParentChildManager component with search parent dialog, unlink confirmation, parent info display with link, children list with status badges + location counts; integrated into provider Summary tab (visible to all users, admin controls for site_admin); organization_type filter in providers list (all/parent/child/standalone) with API support for post-query parent detection based on children count; child location badge indicator in providers table; organization_type field added to ProviderFilters TypeScript type
- [x] Parent/child provider linking - Sprint 1 (Database + Security) (2026-02-24) — Complete foundation for multi-location organizations: migration with parent_provider_id + audit columns + indexes + constraints; database helper functions for child IDs and access checking; TypeScript types (ProviderHierarchy, ParentOrgStats, ProviderAccessInfo); updated provider-access endpoint to include children in accessibleProviderIds; access control integrated into provider detail/locations/notes APIs via linksy_user_can_access_provider() RPC; admin API endpoints for set-parent, get-children, get-hierarchy; React Query hooks (useProviderHierarchy, useProviderChildren, useSetParentProvider); parent admins automatically inherit access to all child sites
- [x] Provider phone extension field (2026-02-24) — Added `phone_extension VARCHAR(20)` to `linksy_providers`; editable from Summary tab; included in LLM context cards (format: "Phone: (555) 123-4567 ext. 123"); updated API, UI, and TypeScript types
- [x] Provider service ZIP coverage (2026-02-24) — Added `service_zip_codes TEXT[]` to `linksy_providers`; default null/empty = serves all areas; editable from Summary tab with comma-separated input; search API filters providers by client ZIP; excluded providers returned in `excludedByZip` field; LLM context cards show "Service Area: ZIP codes X, Y, Z" or "Service Area: All areas"; GIN index for performance
- [x] Referral cap per client (4 max) (2026-02-24) — Enforced maximum 4 active/pending referrals per client (identified by email or phone); validation in both `/api/tickets` and `/api/linksy/tickets`; returns 429 error with helpful message and existing ticket info when cap exceeded; only counts pending tickets (not resolved)
- [x] Automated test framework — Vitest + @testing-library/react; `vitest.config.ts`, `vitest.setup.ts`; 31 unit tests across `csv.ts` and `error-handler.ts`; `npm run test:run` added to CI; `npm run test` (watch), `npm run test:coverage` available
- [x] Host usage controls and no-key rate limiting — `POST /api/linksy/search` enforces host budget + per-host/IP search limits; `POST /api/linksy/tickets` supports host-context ticket limits and `search_session_id`; host access remains slug/domain based (no customer API keys)
- [x] Host usage reporting uplift — `/dashboard/admin/hosts` now includes avg tokens/search, budget health summary, and per-host utilization %
- [x] Playwright baseline setup — added `@playwright/test`, `playwright.config.ts`, `e2e/smoke.spec.ts`, npm scripts (`test:e2e`, `test:e2e:ui`, `test:e2e:headed`)
- [x] Referral workflow e2e (public leg) — `e2e/referral-workflow.spec.ts` covers `/find-help` crisis check, AI search results, provider selection, interaction tracking, and referral ticket submission payload/confirmation
- [x] Referral workflow e2e (authenticated status-update leg) — env-gated admin login helper (`e2e/helpers/auth.ts`) + dashboard ticket status update flow in `e2e/referral-workflow.spec.ts`; verifies ticket has `client_email` and PATCH status update to exercise email trigger path in `app/api/tickets/[id]/route.ts`
- [x] Vitest discovery scope fix — `vitest.config.ts` now restricts `include` to `__tests__/**/*.test.{ts,tsx}` and excludes `node_modules`, `e2e`, `.next`; `npm run test:run` back to project-only tests (31 passing)
- [x] Sentry error tracking — `@sentry/nextjs` installed; instrumentation pattern (`instrumentation.ts` + `instrumentation-client.ts`); `global-error.tsx` with CSS import and Tailwind styling; `next.config.js` wrapped with `withSentryConfig`; set `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` env vars to enable
- [x] Limited field editing for provider staff — `PATCH /api/providers/[id]` now allows active provider contacts to update description, phone, email, website, hours, social links, referral instructions; Edit Profile card on My Organization page with inline form
- [x] Provider Management bulk actions — checkboxes + bulk activate/deactivate bar + export selected on providers list; `PATCH /api/admin/providers/bulk`
- [x] LLM Context Card preview — shown in Details tab of provider detail page; `pre` block with mono font; "not generated" fallback
- [x] Search quality metrics — Details tab shows total interactions, profile views, CTR (clicks/views), referral conversion rate (tickets/views), per-type breakdown
- [x] Private/Secure Notes — `is_private` column on `linksy_provider_notes`; server-side visibility filter in GET provider detail; toggle switch + amber lock badge in UI; site_admin can edit any note
- [x] GitHub Actions CI — `.github/workflows/ci.yml` runs `type-check` + `lint` on push/PR to main
- [x] Provider-scoped analytics — `GET /api/providers/[id]/analytics`, `useProviderAnalytics` hook, engagement cards (profile views, phone/website/directions clicks last 30 days + all time) on My Organization page
- [x] Event approval queue — admin events page at `/dashboard/admin/events` with Pending/Approved/Rejected tabs + count badges; approve/reject actions
- [x] Calendar view for events — List/Calendar toggle on admin events page and provider detail EventsTab; month grid with prev/next navigation and today highlight
- [x] Recurrence rule support (iCal RRULE) — `recurrence_rule` column on `linksy_provider_events`; select in event form (Daily/Weekly/Bi-weekly/Monthly/Annually); blue badge in list view; ↻ icon in calendar cells
- [x] Public hero/landing page — marketing page at `/` with features, how-it-works, and CTA sections; redirects logged-in users to `/dashboard`
- [x] Provider onboarding page — `app/join/provider/page.tsx`; public form → `POST /api/onboarding/provider`; emails admin on submit
- [x] Multi-step provider application wizard — rewrote `/join/provider` as 5-step form (basic info, locations, services/needs, contact, review); structured JSONB columns on `linksy_provider_applications`; public need-categories API; approval flow now provisions all locations, need associations, and contacts from structured data
- [x] Host onboarding page — `app/join/host/page.tsx`; public form with embed code preview → `POST /api/onboarding/host`; emails admin on submit
- [x] Search-to-referral funnel visualization — 3-stage funnel (searches → engaged → converted) with rates; in Search & AI tab of reports dashboard; data from `services_clicked` and `created_ticket` on `linksy_search_sessions`
- [x] Geographic distribution of searches — top zip codes bar chart in Search & AI tab; sourced from `zip_code_searched` on `linksy_search_sessions`
- [x] Average time-to-resolution for tickets — avg days card + per-status breakdown bar chart in Referrals tab; computed from `created_at`/`updated_at` on resolved `linksy_tickets`
- [x] Email notifications — new ticket assigned (to default referral handler) + ticket status update (to client); fire-and-forget via `lib/utils/email.ts` hooked into `POST /api/tickets` and `PATCH /api/tickets/[id]`
- [x] Email template customization — `linksy_email_templates` override table, admin APIs (`/api/admin/email-templates`), admin UI (`/dashboard/admin/email-templates`), and runtime placeholder rendering in `lib/utils/email.ts`
- [x] Google + Microsoft OAuth login — buttons in `components/auth/login-form.tsx`, callback handler at `app/auth/callback/route.ts`
- [x] Search session + interaction tracking — `linksy_search_sessions`, `linksy_interactions` tables; `POST /api/linksy/interactions` endpoint; sessionId returned from search and passed back on subsequent messages
- [x] LLM Context Cards — auto-generated markdown per provider stored in `llm_context_card`; fed to `gpt-4o-mini` for conversational search responses; batch endpoint `POST /api/admin/linksy/context-cards`
- [x] Widget customization UI enhancement (secondary color, header bg, font family, live preview, logo upload)
- [x] Search & AI Analytics tab in reports dashboard (`/api/stats/search-analytics`)
- [x] Crisis detection system with emergency resource banners
- [x] Provider portal via `/dashboard/my-organization`
- [x] Host widget embedding via `/find-help/[slug]`
- [x] Provider event management (CRUD + approval status)
- [x] Contact management with invitation workflow
- [x] Referral ticket management with status tracking
- [x] Needs taxonomy management
- [x] CSV export for providers and referrals

## Conventions

- Keep tasks small and outcome-focused.
- Add links to related ADRs, PRs, or files when helpful.
- Move items to Done instead of deleting.
- See `FEATURES_CHECKLIST.md` in the project root for the full feature inventory.
