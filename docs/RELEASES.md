# Releases

## Upcoming
- Date: TBD (next session)
- Scope:
  - Enforce per-client referral cap of 4 (replace current broader limit behavior)
  - Bulk import approval-flag workflow before full activation
  - Add call log as a provider note-type option
  - Finalize parent/child account linking model + UI
  - Finalize `Needs` vs `Needs Addressed` copy/placement decision
  - Webhook admin end-to-end smoke validation and docs polish

## Recent
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
