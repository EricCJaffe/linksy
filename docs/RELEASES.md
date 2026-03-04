# Releases

## Recent

- Date: 2026-03-03
- Summary: Security audit remediation + documentation overhaul
  - Resolved all 4 CRITICAL security vulnerabilities: XSS sanitization (DOMPurify), missing `/api/invitations/accept` endpoint, open redirect in auth callback + login form, ticket numbering race condition (PG sequence + RPC)
  - Resolved all 6 HIGH security vulnerabilities: OpenAI error handling, hardcoded SITE_ID → env var, provider API RLS bypass, `is_private` comment enforcement, merge fail-fast
  - Resolved 7 of 11 MEDIUM code quality findings: `setTimeout` cleanup, AbortController on search bar, notification user_id scoping, `parseInt` NaN handling, error response disclosure, CSRF http:// gating
  - Resolved 3 of 8 LOW code quality findings: `alert()` → toast, sensitive logging removal, null check with optional chaining
  - Wrote RLS security hardening migration (`20260303000002_rls_security_hardening.sql`) covering 6 tables — pending Supabase apply
  - Major documentation cleanup: rewrote `docs/TASKS.md` (removed duplicates, synced roadmap with actual code state, consolidated completed items), updated `FEATURES_CHECKLIST.md` (audited ~200 items against codebase, marked ~85% complete), updated `docs/AUDIT-2026-03-02.md` (marked completed findings)
  - Net audit status: 20 of 30+ findings resolved; 9 remain open (4 MEDIUM, 5 LOW code quality; plus RLS migration apply)

- Date: 2026-03-03 (session 2)
- Summary: Final audit sweep + reports page fix
  - Fixed reports page "Failed to fetch reports" crash (references to dropped columns `assigned_to`, `need_category`, `imported_at`; `is_crisis` → `crisis_detected`)
  - Resolved 4 remaining MEDIUM findings: crisis keyword auth, activity logging browser→server, unsafe `any` types, query staleTime/gcTime (11 hooks)
  - Resolved all 5 remaining LOW findings: array index keys (4 components), silent catches, env var validation, file upload paths, CSV export error handling
  - Updated documentation (TASKS.md, AUDIT doc, RELEASES.md) to reflect final audit status
  - Net audit status: 29 of 30+ findings resolved; 1 MEDIUM remains (in-memory rate limiter → Upstash Redis, requires infrastructure); plus RLS migration pending apply

- Date: 2026-03-02 (afternoon)
- Summary: Auth fix, platform audit integration, go-live roadmap
  - Fixed dashboard stall on login by invalidating stale React Query cache on auth state change (`onAuthStateChange` listener in `providers.tsx`, cache clearing in `login-form.tsx`, reduced staleTime)
  - Added combined platform audit document (`docs/AUDIT-2026-03-02.md`) covering code review findings + Supabase schema reference + RLS security audit
  - Created phased go-live roadmap in `docs/TASKS.md` with 4 phases: Phase 0 (critical security + data blockers), Phase 1 (feature completion + hardening), Phase 2 (business operations), Phase 3 (HIPAA compliance)
  - Integrated all 30+ audit findings into roadmap by severity (CRITICAL/HIGH/MEDIUM/LOW)
  - Added 7 RLS database security findings not previously tracked
  - Created `AGENTS.md` for OpenAI Codex (parallel to `CLAUDE.md`)
  - Updated `FEATURES_CHECKLIST.md` with new sections: user migration, billing, public website, AI event search, compliance
  - Doc consistency pass across CONTEXT.md, RELEASES.md, CLAUDE.md, SUPABASE.md

- Date: 2026-03-02 (morning)
- Summary: Code quality and CI health sweep
  - Fixed ESLint config: removed `next/typescript` (Next 15-only); lint now loads correctly under Next 14
  - Fixed Sentry `global-error.tsx`: added `globals.css` import + Tailwind classes so error boundary no longer strips all page styling
  - Fixed all ~40 `react/no-unescaped-entities` lint errors across 20 files; added `"warn"` rule as safety net
  - Fixed `jsx-a11y/alt-text` false positive (Lucide `Image` → `ImageIcon` alias)
  - Fixed `handleSelect` missing `useCallback` dep in `search-bar.tsx`
  - Removed 3 debug `console.log` from middleware auth redirects
  - Fixed 8 `react-hooks/exhaustive-deps` warnings (moved fetch fns inside `useEffect` or wrapped in `useCallback`)
  - Removed 3 dead code files (160 LOC): `accordion.tsx`, `useSla.ts`, `routes.ts`
  - Net result: lint errors 40+ → 0; lint warnings 20 → 10; type-check and tests green

- Date: 2026-02-26
- Summary:
  - Added region-tenant model migration and backfill tooling (Impact Clay + United Way of North Florida).
  - Tenant UI and webhooks now filter to region tenants only.
  - Tenant creation now tags `settings.type = region` by default.

- Date: 2026-02-25
- Summary:
  - Fixed OAuth callback routing (public `/auth/*` handling) and added OAuth redirect logging.
  - Restored missing Supabase schema pieces (sites table, `pg_trgm`, ticket `custom_data`, admin contact types).
  - Unified ticket number format to `R-<sequence>-<suffix>` starting at 2000.
  - Webhooks: added tenant-aware routing for `ticket.created`, `ticket.status_changed`, `ticket.assigned`, `ticket.forwarded`, and `ticket.reassigned`.
  - Added backfill script for provider tenants after imports and documented webhook troubleshooting steps.

- Date: 2026-02-23
- Summary:
  - Reworked provider Summary `Needs Addressed` to taxonomy-driven category/need multi-select in edit mode with grouped display in view mode.
  - Set taxonomy admin default filter to active categories and cleaned up legacy inactive duplicates after remap.
  - Fixed provider note creation/update compatibility and attachment flow; added note metadata/actions (pin/copy/edit/delete).
  - Standardized referral status colors and expanded summary UI controls (contact preferences, support entry point updates).
