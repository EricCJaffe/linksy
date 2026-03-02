# Releases

## Recent
- Date: 2026-03-02
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
