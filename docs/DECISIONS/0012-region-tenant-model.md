# 0012 Region Tenant Model

## Date
2026-02-25

## Status
Accepted

## Context
The previous migration (`20260224240000_link_providers_to_tenants.sql`) created a
tenant per provider, which caused UI confusion (many tenants) and broke
tenant-scoped features like webhooks when provider tenants did not align with
regional operations.

Linksy needs tenants to represent **regions** (Impact Clay now, Impact Duval/other
regions later) while providers remain organizations under a tenant.

## Decision
Adopt a **region-as-tenant** model:
- Impact Works is the site (site_admin scope).
- Tenants represent regions (Impact Clay now; United Way of North Florida reserved).
- Providers belong to a region via `linksy_providers.tenant_id`.
- Provider contacts remain provider-scoped; site admins can access all tenants.

## Consequences
- Providers must be assigned to a region tenant after imports.
- Webhooks and tenant UI are scoped to region tenants.
- Provider-per-tenant records remain in the database for historical data, but
  UI and APIs should filter to region tenants.

## Links
- `supabase/migrations/20260225223000_region_tenant_model.sql`
- `scripts/backfill-provider-tenants.sql`
