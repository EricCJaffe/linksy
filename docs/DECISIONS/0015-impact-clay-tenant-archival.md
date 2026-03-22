# ADR-0015: Impact Clay Tenant Archival

**Date:** 2026-03-12
**Status:** Accepted
**Relates to:** TASK-037, ADR-0012 (Region Tenant Model)

## Context

Impact Clay was the original region tenant. The organization is transitioning to Impact Works as the primary entity. Impact Clay needs to be retired from active use while preserving all historical data (referrals, providers, audit trails).

Two decisions were pending:
1. **Archive vs. delete** from active dropdowns
2. **Keep historical referrals** attributed to Impact Clay vs. migrate to Impact Works

## Decision

**Archive as read-only. Keep all historical data attributed to Impact Clay.**

### Rationale

- **Archival over deletion:** Soft-delete via `is_active` flag is reversible, preserves foreign key integrity, and avoids cascading data loss. The tenant record remains in the database for joins and historical queries.
- **Keep attribution:** Migrating referrals would rewrite history, break audit trails, and conflate data from two different organizational periods. Reports and exports should reflect the actual tenant at time of creation.

## Implementation

- Added `is_active BOOLEAN NOT NULL DEFAULT true` column to `tenants` table
- Migration sets `is_active = false` for Impact Clay (by slug `impact-clay`)
- Tenant list API (`GET /api/tenants`) filters out `is_active = false` by default; pass `?include_archived=true` to see all
- `useCurrentTenant` hook excludes archived tenants from active memberships
- Public directory API excludes archived tenants
- Admin tenant list shows all tenants with "Active"/"Archived" badge
- Edit dialog includes Archive/Restore toggle for site admins
- Delete button hidden for archived tenants (prevent accidental hard-delete)

## Consequences

- Historical referral queries joining on `tenant_id` continue to work unchanged
- Archived tenants still appear in admin views with "Archived" badge
- If Impact Clay needs to be reactivated, site admin can restore via edit dialog
- Future tenant archival follows the same `is_active` pattern
