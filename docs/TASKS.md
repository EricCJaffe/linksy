# Tasks

## Active

- [ ] Add automated test framework (no tests exist — see `docs/CONTEXT.md` testing section)
- [ ] Integrate Sentry error tracking (`lib/utils/logger.ts:42` — `TODO: Integrate with Sentry, CloudWatch, or other logging service`)
- [ ] Wire up error tracking service in error handler (`lib/utils/error-handler.ts:194` — `TODO: Send to error tracking service`)

## Backlog

Items extracted from `FEATURES_CHECKLIST.md` that are partially or not yet implemented:

### Provider Management
- [ ] Bulk actions on provider list (activate, deactivate, export CSV) — export exists but bulk status change does not
- [ ] "View LLM Context Card" preview on provider detail page
- [ ] Search quality metrics display (popularity score, CTR, conversion rate)

### Events
- [ ] Calendar view for events (currently list-only)
- [ ] Event approval queue page
- [ ] Recurrence rule support (iCal RRULE)

### Analytics
- [ ] Search-to-referral funnel visualization
- [ ] Geographic distribution of searches
- [ ] Average time-to-resolution for tickets

### Widget / Embed
- [ ] JavaScript embed snippet (`widget.js` with `data-api-key`) — currently iframe-only
- [ ] Shadow DOM style isolation for JS embed
- [ ] Per-API-key rate limiting (currently per-IP only)
- [ ] API key management UI (create, revoke, configure per key)

### Provider Portal (Phase 2)
- [ ] Limited field editing for provider staff

### Infrastructure
- [ ] Multi-language support (i18n)
- [ ] Two-factor authentication (2FA)

## Done

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
