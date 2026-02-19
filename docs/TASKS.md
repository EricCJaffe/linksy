# Tasks

## Active

### Data Management
- [ ] Merge contact function — ability to merge duplicate contacts into a single record (dedup provider contacts)
- [ ] Purge provider function — ability to permanently delete a provider and all associated records (locations, contacts, needs, tickets, notes, events)

## Backlog

### Testing
- [ ] Referral workflow end-to-end test plan — widget search → crisis check → provider selection → ticket creation → email notification → status update → client email (blocked on Playwright setup)

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
