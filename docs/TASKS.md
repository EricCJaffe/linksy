# Tasks

## Explicit TODO/FIXME Sources (Code + Docs scan)

- [ ] `README.md` roadmap items currently unchecked:
  - Multi-language support (i18n)
  - Billing and subscription management
  - Two-factor authentication (2FA)
  - SSO integration (SAML)

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
- [ ] Finalize `Needs` vs `Needs Addressed` final placement/labels after stakeholder review (taxonomy UI shipped, naming/placement decision still pending)
- [ ] Parent/child account linking model — define linking rules, UI, and data model updates
- [ ] Webhooks admin smoke validation in live/staging target (create/test endpoint, signature validation, retry/history checks)
- [ ] Referral workflow e2e mailbox assertion leg (outbound email content/delivery verification)
- [ ] Voice input (Whisper) in widget (`/api/linksy/transcribe` + widget mic UX)

## MVP Alignment (Reviewed 2026-02-23)

### Confirmed Complete
- [x] Database + chatbot baseline is live (AI search pipeline + provider/ticket schema in production flow)
- [x] Accept/deny controls for new organization applications (admin review + approve/reject)
- [x] Note date/time stamps in provider timeline and notes views
- [x] Org Needs categories on provider Summary page (taxonomy-driven category + need selection/display)
- [x] Duplicate referral guard for same client/provider/need window
- [x] ZIP code + provider services matching logic in search pipeline

### Confirmed Requirements (Still Open)
- [ ] Merge contacts (dedup + merge workflow for provider contacts)
- [ ] Bulk import approval flagging: imported records should be reviewable/approvable before full activation
- [ ] Referral pending aging notifications: alert/escalation when pending referrals exceed configured age
- [ ] Bulk referral status update with automatic client/provider email notifications
- [ ] Auto-reroute option when provider cannot help
- [ ] Referral cap per client: enforce maximum of 4 referrals (replace current broader limit behavior)
- [ ] Provider service ZIP coverage field: allow providers/admins to define supported ZIP codes and exclude referrals outside that coverage
- [ ] Provider phone extension field (UI + DB schema + API support)

### Provider Portal / Notes Enhancements (Open)
- [ ] Add call log as a provider note-type option (structured call details attached to notes flow)

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
- [ ] Merge contact function — ability to merge duplicate contacts into a single record (dedup provider contacts)
- [ ] Purge provider function — ability to permanently delete a provider and all associated records (locations, contacts, needs, tickets, notes, events)
- [ ] Finalize `Needs` vs `Needs Addressed` placement — review the Summary page + Notes/Referrals context and lock final field locations/labels so data entry flow is unambiguous
- [ ] Parent/child account linking model — define how parent and child provider accounts should be linked, displayed, and edited in the portal

## Backlog

### Testing
- [ ] Referral workflow e2e (mailbox assertion leg) — outbound email delivery/content assertions still need mailbox capture strategy (MailHog/test inbox); status-update trigger path is now covered in Playwright
- [ ] Webhooks admin UI smoke validation — create webhook in `/dashboard/admin/webhooks`, run `Test`, verify signed headers/payload at receiver, confirm delivery history filters/pagination and secret reveal/copy/rotate behavior

### Widget / Embed
- [x] Fix iframe cross-origin embedding — `/find-help/*` now overrides `X-Frame-Options` and sets `frame-ancestors *` CSP; all other routes keep `SAMEORIGIN`
- [x] `host_allowed_domains` enforcement — `linksy_resolve_host` RPC updated to return `allowed_domains`; checked in `find-help/[slug]/page.tsx` against `Referer` header; direct navigation always allowed
- [x] JavaScript embed snippet — `public/widget.js`; reads `data-slug`, derives base URL from script `src`, injects responsive iframe with `allow="geolocation"`
- [ ] Voice input (Whisper) — mic button in widget → `MediaRecorder` → `POST /api/linksy/transcribe` → OpenAI Whisper → transcript in textarea; update `widget.js` to add `allow="microphone"` to iframe

### Authentication
- [ ] Finalize Microsoft OAuth — verify Azure AD app registration, test login flow end-to-end, confirm callback handling and role assignment
- [ ] Finalize Google OAuth — verify Google Cloud Console setup, test login flow end-to-end, confirm callback handling and role assignment

### Provider Portal (Phase 2)

### Infrastructure
- [ ] Spanish (es) language support — translations object in widget (~20 strings) + `lang` param threaded to AI prompt; `widgetConfig.language` field; browser/URL auto-detect
- [ ] 2FA for admin users — TOTP-based (site_admin + tenant_admin roles only); requires TOTP library + DB changes + UI flow

## Done

- [x] Automated test framework — Vitest + @testing-library/react; `vitest.config.ts`, `vitest.setup.ts`; 31 unit tests across `csv.ts` and `error-handler.ts`; `npm run test:run` added to CI; `npm run test` (watch), `npm run test:coverage` available
- [x] Host usage controls and no-key rate limiting — `POST /api/linksy/search` enforces host budget + per-host/IP search limits; `POST /api/linksy/tickets` supports host-context ticket limits and `search_session_id`; host access remains slug/domain based (no customer API keys)
- [x] Host usage reporting uplift — `/dashboard/admin/hosts` now includes avg tokens/search, budget health summary, and per-host utilization %
- [x] Playwright baseline setup — added `@playwright/test`, `playwright.config.ts`, `e2e/smoke.spec.ts`, npm scripts (`test:e2e`, `test:e2e:ui`, `test:e2e:headed`)
- [x] Referral workflow e2e (public leg) — `e2e/referral-workflow.spec.ts` covers `/find-help` crisis check, AI search results, provider selection, interaction tracking, and referral ticket submission payload/confirmation
- [x] Referral workflow e2e (authenticated status-update leg) — env-gated admin login helper (`e2e/helpers/auth.ts`) + dashboard ticket status update flow in `e2e/referral-workflow.spec.ts`; verifies ticket has `client_email` and PATCH status update to exercise email trigger path in `app/api/tickets/[id]/route.ts`
- [x] Vitest discovery scope fix — `vitest.config.ts` now restricts `include` to `__tests__/**/*.test.{ts,tsx}` and excludes `node_modules`, `e2e`, `.next`; `npm run test:run` back to project-only tests (31 passing)
- [x] Sentry error tracking — `@sentry/nextjs` installed; `sentry.client/server/edge.config.ts` initialized; `lib/utils/logger.ts` `sendToExternalService` calls `Sentry.captureException/captureMessage`; `lib/utils/error-handler.ts` `logError` calls `Sentry.captureException`; `next.config.js` wrapped with `withSentryConfig`; set `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` env vars to enable
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
