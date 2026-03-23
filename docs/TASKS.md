# Tasks

> Last updated: 2026-03-23. See `FEATURES_CHECKLIST.md` for the full feature inventory.
> Program review tasks (TASK-001–039) from [Heather Johnston review 2026-03-03](PROGRAM-REVIEW-2026-03-03.md).

## Go-Live Roadmap

Organized into phases. Everything in Phase 0–2 must be completed or have a clear workaround before public launch.

### Phase 0 — Critical Security & Data (Blockers)

These must be resolved first. Security issues block go-live; data issues block user acceptance.

#### 0.1 CRITICAL Security Fixes — COMPLETE

All four critical vulnerabilities from [Audit 2026-03-02](AUDIT-2026-03-02.md) are resolved.

- [x] **XSS: Unsanitized `dangerouslySetInnerHTML`** — Added isomorphic-dompurify. COMPLETED 2026-03-03
- [x] **Missing `/api/invitations/accept` endpoint** — Created endpoint. COMPLETED 2026-03-03
- [x] **Open redirect in `/api/auth/callback`** — Added safeRedirectPath() validation. COMPLETED 2026-03-03
- [x] **Race condition in ticket numbering** — Created PG sequence + RPC. COMPLETED 2026-03-03

#### 0.2 HIGH Security Fixes — COMPLETE

All six high-severity vulnerabilities from [Audit 2026-03-02](AUDIT-2026-03-02.md) are resolved.

- [x] **OpenAI API calls missing error handling** — Added try/catch with 503 fallback. COMPLETED 2026-03-03
- [x] **Hardcoded SITE_ID** — Replaced with `process.env.LINKSY_SITE_ID`. COMPLETED 2026-03-03
- [x] **Provider API bypasses RLS** — Switched to `createClient()` + optional tenant_id. COMPLETED 2026-03-03
- [x] **Open redirect in login form** — Added safeRedirectPath() validation. COMPLETED 2026-03-03
- [x] **Non-admin users can set `is_private` on comments** — Server enforces site_admin only. COMPLETED 2026-03-03
- [x] **Merge operation has no transaction/rollback** — Changed to fail-fast on first error. COMPLETED 2026-03-03

#### 0.3 RLS / Database Security Fixes

Migration written: `20260303000002_rls_security_hardening.sql`. **Needs to be applied to Supabase.**

- [x] **HIGH: `linksy_provider_contacts` — RLS disabled entirely.** Migration re-enables RLS with provider-scoped policies. COMPLETED 2026-03-03 (migration pending apply)
- [x] **HIGH: `linksy_provider_notes` — `is_private` not enforced at RLS level.** Migration adds separate policies for admin vs contacts. COMPLETED 2026-03-03 (migration pending apply)
- [x] **MEDIUM: `linksy_tickets` — No client-view policy.** Migration adds email-based client view. COMPLETED 2026-03-03 (migration pending apply)
- [x] **MEDIUM: `linksy_call_logs` — Overly permissive.** Migration scopes to provider contacts. COMPLETED 2026-03-03 (migration pending apply)
- [x] **MEDIUM: `linksy_custom_fields` — Unscoped.** Migration scopes to provider admin. COMPLETED 2026-03-03 (migration pending apply)
- [x] **MEDIUM: `linksy_surveys` — Unrestricted UPDATE.** Migration restricts to admin only. COMPLETED 2026-03-03 (migration pending apply)
- [ ] **LOW: `linksy_search_sessions` — Anon update has no row filter.** One session could modify another. **Add `id = session_id` filter.**

#### 0.4 User Migration Strategy
- [ ] **Design auth migration plan for existing users** — ~167+ users in Supabase with `user_id` set as `linksy_provider_contacts` but no passwords. Options:
  - **(a) Magic link / passwordless invite flow** — One-time email link → set password (leverages `/invite/[token]` + `/auth/set-password`)
  - **(b) Bulk password-reset emails** — `resetPasswordForEmail()` via Supabase Admin API
  - **(c) First-login password creation** — Self-service claim by email verification
  - **Decision needed:** Which approach? Does every contact need login access, or only primary contacts?
- [ ] Audit `linksy_provider_contacts` to confirm valid `user_id` references in `auth.users`
- [ ] Audit email addresses for deliverability
- [ ] Build or adapt bulk invite script
- [ ] Test migration flow end-to-end with small batch
- [ ] Document rollout communication plan

#### 0.5 Data Migration & Import (Pre-Go-Live Sync)
- [ ] **Incremental import to sync delta from legacy system** — Initial Power Apps → Supabase migration is done; production data has continued accumulating. Need:
  - Identify delta: new providers, updated contacts, new referrals since last import
  - Build incremental import script (or re-run with upsert logic)
  - Reconcile manual edits in Linksy with legacy source-of-truth
  - Run final sync close to go-live (ideally same-day cutover)
- [ ] Verify all provider embeddings and LLM context cards are generated
- [ ] Verify geocoding is complete for all locations
- [ ] Final QA pass: spot-check 10+ providers for data accuracy

#### 0.6 Template Email Data
- [ ] **Collect and configure all email template content** — System exists but needs production-ready copy:
  - New referral notification (to provider)
  - Referral status update (to client)
  - Provider invitation / welcome email
  - User migration / account claim email (ties to 0.4)
  - Ticket comment notification
  - Host-specific template overrides
- [ ] Get final copy from stakeholders (Impact Clay branding, tone, legal disclaimers)
- [ ] Load templates into `linksy_email_templates` table

#### 0.7 Email & Domain Setup (Impact Works)
- [ ] **Choose production domain** (e.g., `impactworks.org`, `impactworks.com`, `impactworks.app`)
- [ ] Configure DNS records (Vercel custom domain + email DNS)
- [ ] Set up SPF/DKIM/DMARC records for Resend transactional email
- [ ] Set up shared/alias inboxes (`support@`, `referrals@`, `noreply@`)
- [ ] Update env vars: `ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`
- [ ] Verify Resend domain authentication
- [ ] **[TASK-034] Migrate From email address** — Current: Linksy@impactclay.org → Linksy@impact-works.org (confirm with IT Assist: rename mailbox or create new + forward). Update all templates, From/Reply-To fields, provider-facing contact info.

#### 0.8 Impact Clay Archival [DONE]
- [x] **[TASK-037] Archive "Impact Clay" tenant as read-only** — Archived via `is_active` flag on tenants table. Historical referrals remain attributed to Impact Clay. Tenant hidden from active dropdowns but visible (read-only) in admin tenant list. Reversible via "Restore Tenant" in edit dialog. See ADR-0015.

---

### Phase 1 — Feature Completion & Hardening (Pre-Go-Live)

Core features that users and admins need on day one, plus remaining quality fixes.

#### 1.1 Remaining Code Quality Fixes (from [Audit 2026-03-02](AUDIT-2026-03-02.md))

10 of 11 MEDIUM audit findings resolved. 1 remaining requires infrastructure (Upstash Redis):

- [x] **Crisis keyword test endpoint has no auth** — Added `requireAuth()`. COMPLETED 2026-03-03
- [ ] **In-memory rate limiter ineffective on Vercel** — `lib/utils/rate-limit.ts` stores state per-instance. Use Upstash Redis for production.
- [x] **Activity logging uses browser client** — Switched to server-side API call. COMPLETED 2026-03-03
- [x] **Unsafe `any` types in hooks** — Created proper interfaces for `useCurrentTenant.ts` and `find-help/page.tsx`. COMPLETED 2026-03-03
- [x] **Missing staleTime/gcTime on queries** — Added to 11 hooks across 8 files. COMPLETED 2026-03-03

#### 1.2 Reassign Referral to Another Provider
- [ ] **End-to-end verification of auto-reroute** — Feature completed 2026-02-25 (provider flags "unable to assist" → system offers reassignment). Need to:
  - E2E test: create referral → provider marks unable → admin reassigns to new provider
  - Verify new provider receives notification email
  - Verify ticket history/comments reflect reassignment
  - Verify `ticket.reassigned` webhook fires correctly
  - Test from provider portal view (not just admin)

#### 1.3 Events Visibility for End Users — COMPLETE
- [x] **Decision: Events appear in chatbot search results** — Events shown alongside providers when they match the user's need and are nearby. COMPLETED 2026-03-09.
- [x] Implemented in find-help page and host-embedded widget
- [x] Only approved, public, future events shown publicly (enforced by `linksy_search_events_by_needs` RPC)

#### 1.4 AI Search Includes Events — COMPLETE
- [x] **Extended AI search pipeline to include event listings** — COMPLETED 2026-03-09. Changes:
  - Added `need_id` (service category), `address`, `latitude`, `longitude` columns to `linksy_provider_events` (migration `20260309000001`)
  - Service category and address are mandatory for new events
  - Created `linksy_search_events_by_needs()` RPC: matches events by need ID + proximity (radius-based PostGIS filter)
  - Events geocoded on creation/update via Google Maps API
  - LLM context includes event category, address, and distance
  - Falls back to provider-based matching for legacy untagged events
- [x] Search API returns events with `need_name`, `category_name`, `distance_miles`
- [x] EventCard shows service category badge and distance in find-help page + widget
- [x] Admin events page shows service category badges
- [x] Event creation/edit form: mandatory Service Category dropdown and Address field

#### 1.5 Host Danger Word Filtering
- [ ] **Verify crisis detection in host-embedded widgets** — System has global `linksy_crisis_keywords` with detection + emergency banners. Verify:
  - Crisis detection works in host-embedded widgets
  - Crisis keywords are comprehensive (review with stakeholders)
  - Test: type crisis keyword in host widget → banner appears
  - Determine if hosts need per-host keyword customization
  - Document safety system for hosts

#### 1.6 Reporting Features
- [ ] **Evaluate reporting gaps** — Analytics dashboard has search, provider, crisis, widget, and ticket tabs. Assess needs for:
  - Exportable reports (CSV/PDF) for board meetings and funders
  - Scheduled report emails (weekly/monthly digest)
  - Provider-facing reports (own referral stats, response times)
  - Host-facing reports (widget usage, search volume, top needs)
  - Funder/grant reporting (aggregate impact metrics)
- [ ] Prioritize which reports needed for go-live vs. post-launch
- [ ] Build priority reports
- [ ] **[TASK-031] Required analytics reports** — 10 specific reports requested: total referrals, deduplicated by service/client, by date range, top services, top categories, clients with multiple referrals for same need, clients with most total referrals, status breakdown by provider, zip code breakdown with map, returning client flag. All exclude test referrals by default.
- [ ] **[TASK-030] Referral counting logic** — Date range filter on all analytics (presets: week/month/quarter/year/custom). Count unique client+service combos (deduplicate within same category, e.g., housing). "True Unique Clients" metric. Admin toggles to exclude test/blank-service referrals. Default alphabetical, sortable.

#### 1.7 UI Terminology Replace (Program Review) [TASK-001]
- [x] **System-wide label replacements** — COMPLETED 2026-03-06. Updated across all UI strings:
  - "Customer" → "Client" (contact type dropdown)
  - "Needs" → "Services" (sidebar nav, page heading)
  - "Tickets" → "Referrals" (bulk actions, error messages, dialogs, aria labels)
  - "Need Addressed" → "Service Provided" (all 6 status label maps + report charts)
  - "Needs Addressed" → "Services Provided" (provider detail card title)
  - "Forward Ticket" → "Transfer Referral", "Reassign Ticket" → "Reassign Referral"
  - "Ticket Actions/Info" → "Referral Actions/Info"
  - Landing page: "referral tickets" → "referrals"
- [x] Applies to: frontend labels, exported reports, dropdown text. **Not** database column names. *(Remaining: email templates still use old terms — ties to 0.6.)*

#### 1.8 Referral Workflow Enhancements (Program Review)
- [x] **[TASK-014] Add status values: "In Process" and "Transferred Another Provider"** — COMPLETED 2026-03-06. Added `in_process` (yellow) and `transferred_another_provider` (gray) to enum type, all 6 UI status label/color maps, bulk update validation, export groupings (open includes in_process, closed includes transferred), stats overview, referral cap (in_process counts toward cap), and database migration. Email templates updated 2026-03-07: status label map now includes all 9 statuses, status-specific template keys (`ticket_status_in_process`, `ticket_status_transferred`) with fallback to generic. *(Remaining: auto-set transferred on forward action — ties to TASK-026.)*
- [x] **[TASK-026] Referral transfer workflow** — COMPLETED 2026-03-12. Forward-to-provider auto-sets status to `transferred_pending` (new DB enum value, migration `20260312000002`). Forward-to-admin auto-sets `transferred_another_provider`. Max 2 transfers enforced in API with 422 response; site admins can override via `admin_override` flag (logged in audit trail). Updated forward dialog: shows transfer count indicator, admin override checkbox, status change preview. New status added to all 10+ status label/color maps, email templates, bulk validation, export groupings (transferred_pending = open), referral cap, and stats overview. Same referral number maintained throughout chain. `forwarded_from_provider_id` preserved for transfer history tracking.
- [x] **[TASK-029] Duplicate referral detection** — COMPLETED 2026-03-07. Detection logic with three cases (B: exact duplicate, A: high volume, C: consecutive day). Applied to both APIs. `duplicate_flag_type` column + indexes. Admin "Potential Duplicates" report page at `/dashboard/admin/duplicates` with API, summary cards, and clickable table.
- [x] **[TASK-018] Test referral flagging** — COMPLETED 2026-03-07. `is_test` column + migration, auto-flag "Mega Coolmint", TEST badge in list/detail, excluded from analytics by default. Admin "Include Test Referrals" toggle button on Reports page. `include_test` param supported on `/api/reports`, `/api/stats/overview`, `/api/stats/reports`.
- [x] **[TASK-017] "Send Test Referral" button** — AlertDialog on provider detail page header (site admin only). Pre-populates Mega Coolmint, Linksy@impactworks.org, 1-904-330-1848. Auto-flagged is_test. Test referrals bypass duplicate detection, rate limiting, and referral cap. COMPLETED 2026-03-06.

#### 1.9 UI Bugs & Quick Fixes (Program Review)
- [x] **[TASK-007] Fix misspellings on Features tab** — Audited: no misspellings found, "via email" already present. VERIFIED 2026-03-06.
- [x] **[TASK-016] Fix Aging Referrals not loading** — COMPLETED 2026-03-07. Part 1: Widget data loading fixed. Part 2: URL param navigation works. Part 3: Sortable column headers added to tickets page (ticket#, client, provider, status, date). Column filters via TASK-003.
- [x] **[TASK-039] Fix text color tool bug in notes editor** — Replaced CSS group-hover with click-based React state + click-outside dismiss. COMPLETED 2026-03-06.
- [x] **[TASK-012] Restore record counts at bottom of lists** — Updated DataTable base component, audit logs, review imports, and support tickets pages. Providers/Referrals/Contacts already had counts. COMPLETED 2026-03-06.
- [x] **[TASK-024] Services list default to expanded** — Already defaults expanded with Expand All/Collapse All toggle (needs/page.tsx lines 135, 141-147). VERIFIED 2026-03-06.

#### 1.10 Notes & Comments Improvements (Program Review)
- [x] **[TASK-027] Notes ordering + edit capability** — COMPLETED 2026-03-07. Comment form moved to top, newest-first display. Edit button on provider notes (timeline + Notes tab) and ticket comments. Edit shows "(edited)" timestamp. Author or site admin can edit. PATCH API extended for content updates.
- [x] **[TASK-028] Private/public note toggle** — COMPLETED 2026-03-06. Inline lock/globe toggle button on provider notes (timeline + Notes tab) and ticket comments. Amber background on private items. PATCH endpoint for comment privacy (admin only). Server-side filtering: private notes hidden from non-admin users in provider API. Org-scoped visibility COMPLETED 2026-03-07: `created_by_tenant_id` column + migration, note creation stores tenant ID, private notes now visible only to creating org + site admins (legacy notes fallback to tenant admin/contact visibility).

#### 1.11 Provider & Contact Enhancements (Program Review)
- [x] **[TASK-023] Services access control (admin only for add/edit)** — COMPLETED 2026-03-12. Taxonomy APIs (categories, needs, synonyms) restricted to site_admin only (`requireSiteAdmin()`). Provider needs endpoints (`/api/providers/[id]/needs`) enforce provider-level access: site admin, tenant admin, or active contact of the provider. Providers can manage which existing services they offer but cannot modify the taxonomy.
- [ ] **[TASK-035] Welcome email for new providers** — Auto-send on approval. Template: welcome message, video link, support info, Helps & Docs reference. Editable in Admin Console. Test send button. *(Ties to 0.6 email templates.)*
- [x] **[TASK-033] Support tickets: visible tab** — COMPLETED 2026-03-12. Already in main navigation with color-coded badge (blue for open, yellow for in-progress). Provider portal has "Submit Support Ticket" link. Badge count shows open + in-progress total.
- [x] **[TASK-013] Add Contacts to dashboard nav panel** — Already exists in sidebar (sidebar.tsx line 47). VERIFIED 2026-03-06.

#### 1.12 Needs Stakeholder Decisions (Program Review) [CLARIFY FIRST]
- [ ] **[TASK-005] Email bounce handling** — How should system handle bounces? Stop after N? Flag "Bad Email"? One admin notification? Auto-queue for verification?
- [ ] **[TASK-009] Provider self-registration form** — Is form identical to internal page? Who edits structure? Auto-approve from UW? Allow referral/non-referral selection?
- [ ] **[TASK-010] Provider approval workflow** — Where is approval screen? Does UW import bypass approval? Dedicated "Pending Approval" queue tab?

---

### Phase 2 — Business Operations & Polish (Go-Live Adjacent)

Needed for sustainability but not blocking initial launch if timeline is tight.

#### 2.1 LOW Code Quality Fixes (from [Audit 2026-03-02](AUDIT-2026-03-02.md)) — ALL RESOLVED

All 8 LOW findings resolved.

- [x] **Array index used as React key** — Replaced with stable keys across 4 components. COMPLETED 2026-03-03
- [x] **Silent `.catch(() => {})` swallowing errors** — Added intent comments to all silent catches. COMPLETED 2026-03-03
- [x] **Environment variables not validated at startup** — Added runtime validation to Supabase client/server. COMPLETED 2026-03-03
- [x] **File upload paths use `Date.now()` + UUID** — Simplified to UUID-only, added filename length limit. COMPLETED 2026-03-03
- [x] **CSV export no error handling** — Added empty guard, try/finally for URL cleanup, user-facing toast on failure. COMPLETED 2026-03-03
- [x] **`alert()` used for errors** — Replaced with `useToast()`. COMPLETED 2026-03-03
- [x] **Sensitive logging in set-password page** — Removed all console.log/error. COMPLETED 2026-03-03
- [x] **Missing null check** — Added optional chaining to `provider.contacts`. COMPLETED 2026-03-03

#### 2.2 Program Review — UX Enhancements

- [x] **[TASK-004] Phone number format standardization** — COMPLETED 2026-03-06. `formatPhone()` + `phoneToTel()` applied to 5 components. `phone_ext` field on providers. Ext field COMPLETED 2026-03-07: Added phone extension input to new provider wizard, provider self-registration form. `phone_extension` included in provider CSV export. Approval flow passes extension to created provider.
- [x] **[TASK-006] Global search enhancement** — COMPLETED 2026-03-07. Extended `/api/search` to query tickets and contacts. Color-coded result type badges (User=blue, Referral=amber, Contact=green, Module=purple, Setting=gray). Recent search history COMPLETED 2026-03-07: localStorage-based history (up to 8 entries), shown on empty focus/Cmd+K, clear history button, keyboard navigation support.
- [x] **[TASK-008] Provider source tagging** — COMPLETED 2026-03-07. Source dropdown (CC, UW, IW, Self-Registered, Other + free text) on provider details. Filterable column on providers list. Included in exports. Migration adds `source`, `source_other` columns.
- [x] **[TASK-011] Provider export by Source / Zip** — COMPLETED 2026-03-07. Rewritten export API with 15-column CSV (Name, Contact, Email, Phone, Zip, Source, Status, etc). Filter by source and zip before export.
- [x] **[TASK-015] Dashboard chart enhancement** — COMPLETED 2026-03-07. "Top Providers by Referral Volume" horizontal bar chart with date range filter, services toggle, clickable bars → provider detail. Recharts-based.
- [x] **[TASK-019] Provider freeze/hold** — COMPLETED 2026-03-07. Freeze button with reason dropdown + return date. Frozen = no new referrals (enforced in ticket creation API). Self-freeze only if no pending referrals. Admin override. "Frozen" badge + filter. Audit log via provider notes. Migration adds freeze columns.
- [x] **[TASK-020] Call log + notes on Provider Contact page** — COMPLETED 2026-03-07. Contact detail page (`/dashboard/contacts/[id]`) with notes/call log section, add note form with type selector, privacy toggle. Per-contact notes via `contact_id` column on `linksy_provider_notes`.
- [x] **[TASK-022] Voicemail reminder popup** — COMPLETED 2026-03-07. AlertDialog on referral submit: "Check your voicemail — IS IT WORKING? IS IT FULL?" Once per session via sessionStorage.
- [x] **[TASK-025] Export services/needs categories** — COMPLETED 2026-03-07. Export CSV button on Services admin page. CSV: Category, Service Name, Synonyms, Provider Count, Active.
- [x] **[TASK-036] Contacts as standalone tab** — COMPLETED 2026-03-07. Phone + Date Added columns, sortable headers, Export CSV button. Row click → contact detail page.
- [x] **[TASK-003] Column filters on data tables** — COMPLETED 2026-03-07. Tickets page: service/need filter, date range, provider filter + URL param persistence (all filter state preserved in URL). Contacts page: provider and role filter dropdowns. Additional filters COMPLETED 2026-03-07: Providers page zip filter (by location postal code). Tickets page client email + phone filters with URL persistence. Filters passed through hooks to API.
- [x] **[TASK-038] Referral number scale check** — VERIFIED 2026-03-06: PG BIGINT sequence (max 9.2×10¹⁸), `ticket_number` is TEXT (no length cap). Format R-{seq}-{suffix} scales to any volume. Transfer suffix -T1/-T2 support deferred to TASK-026.

#### 2.3 Public-Facing Impact Works Website
- [ ] **Decide approach:** Separate marketing site (WordPress/Webflow) vs. enhanced Linksy landing page at `/`
- [ ] Design: brand guidelines, logo, color palette for Impact Works
- [ ] Content: mission, about, for providers, for communities, pricing, contact
- [ ] SEO: meta tags, Open Graph, sitemap
- [ ] Analytics (Google Analytics / Plausible)

#### 2.4 Stripe Integration — Monthly Recurring Billing
- [ ] **Set up Stripe account and API keys**
- [ ] Define pricing tiers (per-host? per-tenant? flat fee + usage?)
- [ ] Implement Stripe Checkout + Customer Portal
- [ ] Webhook handler (`invoice.paid`, `invoice.payment_failed`, `subscription.updated`, `subscription.deleted`)
- [ ] Link subscription status to host/tenant `is_active`
- [ ] Grace period logic for failed payments
- [ ] Admin UI: subscription status, revenue dashboard
- [ ] Test full lifecycle (subscribe → invoice → pay → cancel)

#### 2.5 QuickBooks Integration
- [ ] **Evaluate approach:** QuickBooks Online API vs. third-party connector (Zapier, Make)
- [ ] Sync Stripe invoices/payments → QuickBooks income entries
- [ ] Map customers to QuickBooks records
- [ ] Implement chosen approach

---

### Phase 3 — Compliance & Scale (Post-Launch Priority)

#### 3.1 HIPAA-Level Capacity
- [ ] Audit current PHI flows (client names, contact info, health-related needs, referral details)
- [ ] Supabase: HIPAA-eligible plan + BAA
- [ ] Vercel: HIPAA compliance posture (may need Enterprise)
- [ ] OpenAI: BAA (Enterprise tier); evaluate PHI in LLM queries
- [ ] Resend/Email: BAA for transactional email
- [ ] Encryption audit (at rest + in transit)
- [ ] PHI access audit logging
- [ ] Data retention policies
- [ ] Staff training documentation
- [ ] Compliance consultant if needed

---

### Phase 4 — Deferred / Post-Launch

#### Existing Backlog
- [ ] Voice input (Whisper) in widget (`/api/linksy/transcribe` + mic UX)
- [ ] Spanish (es) language support / multi-language i18n
- [ ] Two-factor authentication (2FA) for admins
- [ ] SSO integration (SAML)
- [x] Autoupdates for provider description every 90 days — COMPLETED 2026-03-21. Quarterly cron job (Jan/Apr/Jul/Oct) scans provider websites via OpenAI, compares descriptions, emails provider contacts with accept/edit links. Admin can override timing per provider. Email template editable in Admin Console.
- [ ] Enhanced notification workflows beyond baseline
- [ ] Host-specific email template customization (tenant/host-level overrides)
- [ ] Host custom form builder for pre-proposal intake
- [ ] Custom provider referral redirects (external destination behavior)
- [ ] Host filtering by needs/category in admin hosts workflow
- [ ] Chatbot card view support for non-referral providers
- [ ] Advanced workflow verification engine
- [ ] Stronger anti-spam logic beyond current rate/duplicate guards

#### Program Review — Complex Features
- [x] **[TASK-002] Undo/redo (phase 1)** — Rich text editor undo/redo toolbar buttons (Ctrl+Z/Y). Undo toast on instant-save actions (status changes, privacy toggles) via `useUndoableAction` hook. See `docs/SAVE-BEHAVIOR.md`. Phase 2: full action history stack for field edits across all screens.
- [x] **[TASK-032] Per-provider SLA timers** — COMPLETED 2026-03-23. Per-provider `sla_hours` and `sla_reminder_hours` columns on `linksy_providers`. SLA trigger uses provider-specific hours. Master switch via `sla_reminder_enabled` on `linksy_referral_alert_config`. Backfill applied to existing tickets. Migration: `20260322000002_sla_reminder_system.sql`.

#### Program Review — Wish List
- [ ] Address label printing — Avery 8160 format, by zip/region/county/sector
- [ ] Envelope printing — #10 envelope with IW return address
- [x] **[TASK-021] Admin preview of client-facing Provider listing** — COMPLETED. "Public Preview" button (Eye icon) on provider detail page opens modal showing simulated chatbot card with status warnings for missing data.
- [ ] Phone system VM-to-notes integration (Teams-style voicemail transcription)
- [ ] Provider relationship tracking — Flag providers needing in-person contact vs. video
- [ ] Provider satisfaction survey feature
- [ ] **[TASK-008/WL-008] Synonyms management** — Admin-only, for services taxonomy
- [ ] Zip-code gap analysis map — Visual service desert identification
- [ ] CoPilot / AI query assistant — Non-technical admin analytics queries

#### Heather Review — Sections Pending Review
- [ ] Reports tab — full review pending
- [ ] Notifications tab — full review pending
- [ ] Help & Docs tab — full review pending
- [ ] Admin Console — full review pending
- [ ] Provider Portal Preview — full review pending
- [ ] Public Search Preview — full review pending

---

## Manual Verification Needed

Items that need hands-on testing in a live or staging environment:

- [ ] **Apply RLS migration** — Run `20260303000002_rls_security_hardening.sql` on Supabase
- [ ] **Apply ticket numbering migration** — Run sequence + RPC migration on Supabase
- [ ] **Provider user referrals** — Log in as provider user; verify `/dashboard/my-tickets` shows their referrals
- [ ] **Webhook event coverage** — Verify `ticket.assigned`, `ticket.forwarded`, `ticket.reassigned` fire correctly
- [ ] **Referral workflow e2e (email leg)** — Outbound email content/delivery verification (needs mailbox capture strategy: MailHog/test inbox)

#### SQL Scripts — Verify / Run in Supabase

Root-level diagnostic/fix scripts (run manually in Supabase SQL Editor as needed):

- [ ] `CHECK_CONTACT_STATUS.sql` — Verify contact status for specific user (diagnostic, read-only)
- [ ] `FIX_CONTACT_ACCESS.sql` — Fix provider access for specific user (updates contact status/role)
- [ ] `TROUBLESHOOTING.sql` — Full troubleshooting workflow: contact status check, trigger fix (`link_invited_user_trigger`), manual activation, access function test

Data backfill scripts (run once, safe to re-run):

- [ ] `scripts/backfill-provider-tenants.sql` — Assign all providers to Impact Clay tenant + backfill `tenant_users` from active contacts
- [ ] `scripts/check-referral-assignments.sql` — Audit default referral handlers and assignment integrity (diagnostic, read-only)

Recent migrations to verify applied (check `supabase_migrations.schema_migrations` table):

- [x] `20260321000001_add_phone_extension_to_locations_contacts.sql`
- [x] `20260321000002_create_description_reviews.sql`
- [x] `20260321000003_call_log_timer_fields.sql` — included in rollup
- [x] `20260321000004_create_referral_alert_config.sql` — included in rollup
- [x] `20260322000001_add_case_d_duplicate_flag.sql` — included in rollup (fixed: column creation + constraint)
- [x] `20260322000002_sla_reminder_system.sql` — included in rollup
- [x] `20260322000003_seed_help_docs.sql` — applied separately
- [x] `20260323000001_rollup_recent_migrations.sql` — consolidated rollup of the above 4, applied 2026-03-23

---

## Backlog (Future)

### Testing
- [ ] E2E mailbox assertion for referral emails (MailHog/test inbox strategy)

### README Roadmap (unchecked items)
- Multi-language support (i18n) → Phase 4
- Billing and subscription management → Phase 2.3
- Two-factor authentication (2FA) → Phase 4
- SSO integration (SAML) → Phase 4

---

## Done

Items completed across all sessions, newest first.

### 2026-03-03

- [x] **9 remaining audit fixes** — Resolved 4 MEDIUM + 5 LOW findings:
  - MEDIUM: Crisis keyword auth, activity logging client→server, unsafe `any` types, query staleTime/gcTime
  - LOW: Array index keys, silent catches, env var validation, file upload paths, CSV export error handling
- [x] **Reports page crash fix** — Fixed "Failed to fetch reports" caused by references to dropped columns (`assigned_to`, `need_category`, `imported_at`) and `is_crisis` → `crisis_detected`
- [x] **Documentation sync** — Updated TASKS.md, FEATURES_CHECKLIST.md, AUDIT doc, and RELEASES.md to match actual codebase state
- [x] **20 security and quality fixes** — Resolved all 4 CRITICAL + 6 HIGH + 7 MEDIUM + 3 LOW audit findings in a single session:
  - CRITICAL: XSS sanitization (DOMPurify), missing invitations/accept endpoint, open redirect in callback + login, ticket numbering race condition
  - HIGH: OpenAI error handling, hardcoded SITE_ID, provider API RLS bypass, is_private enforcement, merge fail-fast
  - MEDIUM: setTimeout cleanup, AbortController on search bar, notification user_id scoping, parseInt NaN handling, error response disclosure, CSRF http:// gating
  - LOW: alert() → toast, sensitive logging removal, null check with optional chaining
- [x] **RLS security hardening migration** — Wrote `20260303000002_rls_security_hardening.sql` covering 6 tables (provider_contacts, provider_notes, tickets, call_logs, custom_fields, surveys)

### 2026-03-02

- [x] Fixed dashboard stall on login (stale React Query cache invalidation)
- [x] Combined platform audit document (`docs/AUDIT-2026-03-02.md`)
- [x] Created phased go-live roadmap with 4 phases
- [x] ESLint config fix (removed Next 15-only `next/typescript` extend)
- [x] Sentry `global-error.tsx` styling fix
- [x] Fixed ~40 `react/no-unescaped-entities` lint errors
- [x] Fixed `handleSelect` missing `useCallback` dep in search-bar
- [x] Fixed 8 `react-hooks/exhaustive-deps` warnings
- [x] Removed 3 dead code files (160 LOC)
- [x] Lint: 40+ errors → 0 errors, 20 → 10 warnings

### 2026-03-01

- [x] Region tenant model refactor (Impact Works site, Impact Clay tenant)
- [x] Fixed auth middleware multi-tenant membership handling
- [x] Fixed provider user "No referrals found" (tickets API + RLS)
- [x] Webhook dispatch now resolves tenant_id from provider record

### 2026-02-25

- [x] Auto-reroute option when provider cannot help
- [x] Webhooks admin smoke validation
- [x] Finalized Needs vs Needs Addressed placement/labels
- [x] OAuth callback routing fix + redirect logging
- [x] Unified ticket number format `R-<sequence>-<suffix>` starting at 2000
- [x] Webhook events: `ticket.created`, `ticket.status_changed`, `ticket.assigned`, `ticket.forwarded`, `ticket.reassigned`

### 2026-02-24

- [x] Parent/child provider linking (all 4 sprints: DB + security, basic UI, dashboard + reporting, polish + UX)
- [x] Merge contacts + merge providers + purge provider functions
- [x] Bulk import approval flagging
- [x] Referral pending aging notifications
- [x] Bulk referral status update with email notifications
- [x] Referral cap per client (4 max)
- [x] Provider service ZIP coverage
- [x] Provider phone extension field
- [x] Call log as provider note-type option

### 2026-02-23

- [x] Needs Addressed taxonomy-driven UI (category + need multi-select)
- [x] Provider notes flow stabilization
- [x] Referral status color standardization
- [x] Provider summary contact preference controls

### Earlier (see git history)

- [x] AI search pipeline (embedding → vector → LLM)
- [x] Provider/ticket/needs schema + management
- [x] Crisis detection system
- [x] Host widget embedding + customization
- [x] Provider portal + limited field editing
- [x] Event management + approval queue + calendar + recurrence
- [x] Email notifications + template customization
- [x] Google + Microsoft OAuth
- [x] Search session + interaction tracking
- [x] LLM Context Cards + batch generation
- [x] Reports dashboard (search, provider, crisis, widget, ticket analytics)
- [x] Sentry error tracking
- [x] Vitest + Playwright test framework
- [x] GitHub Actions CI
- [x] Provider onboarding wizard (5-step) + host onboarding
- [x] Public hero/landing page

---

## Conventions

- Keep tasks small and outcome-focused.
- Add links to related ADRs, PRs, or files when helpful.
- Move items to Done instead of deleting.
- See `FEATURES_CHECKLIST.md` in the project root for the full feature inventory.
