# Tasks

## Active

- [ ] Add automated test framework (no tests exist — see `docs/CONTEXT.md` testing section)
- [ ] Integrate Sentry error tracking (`lib/utils/logger.ts:42` — `TODO: Integrate with Sentry, CloudWatch, or other logging service`)
- [ ] Wire up error tracking service in error handler (`lib/utils/error-handler.ts:194` — `TODO: Send to error tracking service`)

## Backlog

### Public Presence
- [ ] Public hero/landing page — marketing page at `/` describing Linksy for potential customers
- [ ] Provider onboarding page — public form for a new provider to request to be listed
- [ ] Host onboarding page — public form for an organization to request widget embedding

### Testing
- [ ] Referral workflow end-to-end test plan — widget search → crisis check → provider selection → ticket creation → email notification → status update → client email

### Widget / Embed
- [x] Fix iframe cross-origin embedding — `/find-help/*` now overrides `X-Frame-Options` and sets `frame-ancestors *` CSP; all other routes keep `SAMEORIGIN`
- [ ] `host_allowed_domains` enforcement — column exists on `linksy_providers`, not yet checked in widget route
- [ ] JavaScript embed snippet (`widget.js`) — currently iframe-only

### Events
- [ ] Calendar view for events (currently list-only)
- [ ] Recurrence rule support (iCal RRULE)

### Analytics
- [ ] Search-to-referral funnel visualization
- [ ] Geographic distribution of searches
- [ ] Average time-to-resolution for tickets

### Provider Portal (Phase 2)
- [ ] Limited field editing for provider staff

### Infrastructure
- [ ] Spanish (es) language support — i18n for widget and public-facing pages
- [ ] Two-factor authentication (2FA)

## Done

- [x] Provider Management bulk actions — checkboxes + bulk activate/deactivate bar + export selected on providers list; `PATCH /api/admin/providers/bulk`
- [x] LLM Context Card preview — shown in Details tab of provider detail page; `pre` block with mono font; "not generated" fallback
- [x] Search quality metrics — Details tab shows total interactions, profile views, CTR (clicks/views), referral conversion rate (tickets/views), per-type breakdown
- [x] Private/Secure Notes — `is_private` column on `linksy_provider_notes`; server-side visibility filter in GET provider detail; toggle switch + amber lock badge in UI; site_admin can edit any note
- [x] GitHub Actions CI — `.github/workflows/ci.yml` runs `type-check` + `lint` on push/PR to main
- [x] Provider-scoped analytics — `GET /api/providers/[id]/analytics`, `useProviderAnalytics` hook, engagement cards (profile views, phone/website/directions clicks last 30 days + all time) on My Organization page
- [x] Event approval queue — admin events page at `/dashboard/admin/events` with Pending/Approved/Rejected tabs + count badges; approve/reject actions
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
