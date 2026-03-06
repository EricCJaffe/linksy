# Tasks

> Last updated: 2026-03-06. See `FEATURES_CHECKLIST.md` for the full feature inventory.
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

#### 0.8 Impact Clay Archival [CLARIFY]
- [ ] **[TASK-037] Remove "Impact Clay" as active option while preserving history** — Decisions needed: (a) Archive as read-only or delete from active dropdowns? (b) Keep historical referrals attributed to Impact Clay or migrate to Impact Works?

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

#### 1.3 Events Visibility for End Users
- [ ] **Decide where events appear for public users** — Options:
  - **(a) In chatbot results** — Show relevant events alongside providers
  - **(b) Dedicated `/events` public page** — Standalone calendar/list
  - **(c) On public provider directory** — Events on provider profiles
  - **(d) Combination** — Chatbot results AND dedicated page
  - **Decision needed:** Which approach? Does this vary by host?
- [ ] Implement chosen approach
- [ ] Ensure only `published` events shown publicly

#### 1.4 AI Search Includes Events
- [ ] **Extend AI search pipeline to include event listings** — Currently searches only provider services/needs. Need to:
  - Include upcoming published events in vector search or as supplemental results
  - Add event data to LLM context (name, date, time, location, description, provider)
  - Generate embeddings for events (or match via `linksy_provider_needs`)
  - LLM mentions relevant events naturally
  - Filter to future events only
- [ ] Update search API response to include event cards
- [ ] Widget UI: display event result cards

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
- [ ] **System-wide label replacements** — Global find-and-replace across all UI strings, email templates, exports, dropdowns:
  - "Customer" → "Client"
  - "Needs" → "Services"
  - "Actions" → "Status" / "Statuses"
  - "Tickets" → "Referrals"
  - "Needs Addressed" → "Services Provided"
- [ ] Applies to: frontend labels, email templates, exported reports, dropdown text. **Not** database column names.

#### 1.8 Referral Workflow Enhancements (Program Review)
- [ ] **[TASK-014] Add status values: "In Process" and "Transferred Another Provider"** — New `linksy_ticket_status` enum values. Color-coded. Available to providers and admins. Include in filters, reports, aging view. Trigger email notifications.
- [ ] **[TASK-026] Referral transfer workflow** — On transfer: auto-set original to "Transferred Another Provider". Modal: select new provider, transfer notes, editable email templates (client + new provider). New provider sees "Transferred Pending". Append suffix -T1/-T2 to referral number. Max 2 transfers → admin override. Both providers see transfer history. *(Extends existing 1.2 reassignment feature.)*
- [ ] **[TASK-029] Duplicate referral detection** — Same client+provider+service+day = block. Same client+5 providers+same service+same day = allow but flag. Consecutive day same client+provider = warning. Admin "Potential Duplicates" report. Test referrals exempt.
- [ ] **[TASK-018] Test referral flagging** — `is_test` boolean on tickets. Auto-flag "Mega Coolmint" (case-insensitive) and test button submissions. Exclude from all analytics by default. Admin toggle to include. "TEST" badge in lists.
- [ ] **[TASK-017] "Send Test Referral" button** — On Provider detail screen. Auto-populates: Mega Coolmint, Linksy@impactworks.org, 1-904-330-1848. Flagged as test. Confirmation dialog.

#### 1.9 UI Bugs & Quick Fixes (Program Review)
- [ ] **[TASK-007] Fix misspellings on Features tab** — Audit pre-login home screen for typos/spacing. Add "via email" to "Receive referral tickets from AI-assisted searches" under How It Works.
- [ ] **[TASK-016] Fix Aging Referrals not loading** — Dashboard shows pending count but click-through shows no results. Debug query/filter logic. Add column filters and sort.
- [ ] **[TASK-039] Fix text color tool bug in notes editor** — Color picker sometimes requires right-click + double-click. Fix to single left-click. Test cross-browser.
- [ ] **[TASK-012] Restore record counts at bottom of lists** — "Showing X–Y of Z records" + "X selected" on all paginated views (Referrals, Providers, Contacts, dashboard sub-lists).
- [ ] **[TASK-024] Services list default to expanded** — Change default view to all categories expanded. Add "Collapse All" / "Expand All" toggle. Both admin and provider screens.

#### 1.10 Notes & Comments Improvements (Program Review)
- [x] **[TASK-027] Notes ordering + edit capability** — Comment form moved to top, newest-first display. COMPLETED 2026-03-06 (ordering). *(Remaining: edit button per note with original+edit timestamps, history preservation. Apply to all notes sections.)*
- [ ] **[TASK-028] Private/public note toggle** — Each note gets a private toggle (on/off). Private = visible only to creating org. Can toggle anytime (author or admin). Lock icon indicator. Include privacy state in exports. *(Partially exists: `is_private` field on `linksy_provider_notes` and `linksy_ticket_comments`.)*

#### 1.11 Provider & Contact Enhancements (Program Review)
- [ ] **[TASK-023] Services access control (admin only for add/edit)** — Only admins add/edit service categories. Providers can view and remove from own profile. Permission error on Provider attempts. Synonyms also admin-only.
- [ ] **[TASK-035] Welcome email for new providers** — Auto-send on approval. Template: welcome message, video link, support info, Helps & Docs reference. Editable in Admin Console. Test send button. *(Ties to 0.6 email templates.)*
- [ ] **[TASK-033] Support tickets: visible tab** — Move support ticket access to main navigation (under Referrals or top-level). Show open + in-progress, color-coded. Admins see all, providers see own.
- [ ] **[TASK-013] Add Contacts to dashboard nav panel** — "Contacts" link missing from right panel. Add it, linking to full Contacts list.

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

- [x] **[TASK-004] Phone number format standardization** — `lib/utils/phone.ts` with `formatPhone()` (1-(XXX)-XXX-XXXX) and `phoneToTel()` applied to 5 components. COMPLETED 2026-03-06. *(Remaining: "Ext." field next to every phone field; update exports/email templates.)*
- [ ] **[TASK-006] Global search enhancement** — Dropdown showing recent results while typing. Search across: client name, phone, email, referral number. Last 10 recent searches. Color-coded results with record type. Click navigates to record.
- [ ] **[TASK-008] Provider source tagging** — Add "Source" field to providers (dropdown: CC, UW, IW, Self-Registered, Other + free text). Filterable column. Include in exports and analytics.
- [ ] **[TASK-011] Provider export by Source / Zip** — Export button on Providers list (CSV + Excel). Include: Name, Contact, Email, Phone, Zip, Source, Date Added, Status. Filter before export. Show count.
- [ ] **[TASK-015] Dashboard chart enhancement** — Rename to "Top Providers by Referral Volume." Clickable bars → top 3 services. Toggle: volume-only vs. volume+services. Date range filter.
- [ ] **[TASK-019] Provider freeze/hold** — Freeze button with reason dropdown + optional return date. Frozen = no new referrals. Self-freeze only if Pending cleared. Admin can override. "Frozen" badge + filter. Freeze history in audit log.
- [ ] **[TASK-020] Call log + notes on Provider Contact page** — Currently only on Referrals. Add to Provider Contact page with same note types, privacy toggle, timestamps, edit capability. *(Provider notes already exist via `linksy_provider_notes`; this extends to per-contact level.)*
- [ ] **[TASK-022] Voicemail reminder popup** — On referral submit: "Check your voicemail — IS IT WORKING? IS IT FULL?" Once per session only.
- [ ] **[TASK-025] Export services/needs categories** — Export button on Services admin screen. Excel: Category, Service Name, Synonyms, Provider count. Full hierarchy.
- [ ] **[TASK-036] Contacts as standalone tab** — Top-level "Contacts" nav. List: Name, Org, Phone, Email, Role, Date Added. Filterable/sortable. Search by name without knowing org. Export CSV/Excel.
- [ ] **[TASK-003] Column filters on all data tables** — Every table gets filterable column headers. Filters: date ranges, zip, name search, phone, email, referral number. Persist in session. URL params. "Clear All Filters" button.
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
- [ ] Autoupdates for provider description every 90 days
- [ ] Enhanced notification workflows beyond baseline
- [ ] Host-specific email template customization (tenant/host-level overrides)
- [ ] Host custom form builder for pre-proposal intake
- [ ] Custom provider referral redirects (external destination behavior)
- [ ] Host filtering by needs/category in admin hosts workflow
- [ ] Chatbot card view support for non-referral providers
- [ ] Advanced workflow verification engine
- [ ] Stronger anti-spam logic beyond current rate/duplicate guards

#### Program Review — Complex Features
- [ ] **[TASK-002] Undo/redo system-wide** — Undo button (Ctrl+Z) + Redo (Ctrl+Y) on all data entry screens. Last 5 actions per session. Works for field edits, status changes, notes. Tooltip for non-undoable actions.
- [ ] **[TASK-032] Per-provider SLA timers** — Custom resolution timeframe per provider. Auto-send reminder at due date. Provider can reset, confirm, or transfer. Client notification on transfer.

#### Program Review — Wish List
- [ ] Address label printing — Avery 8160 format, by zip/region/county/sector
- [ ] Envelope printing — #10 envelope with IW return address
- [ ] **[TASK-021] Admin preview of client-facing Provider listing** — Preview button on Provider screen
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
