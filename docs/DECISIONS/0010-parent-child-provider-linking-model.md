# 0010 Parent/Child Provider Linking Model

## Date
2026-02-24

## Status
Accepted

## Context
Linksy needs to support multi-location organizations that want a parent organization
to oversee multiple child providers. The system needs to:
- let site admins link/unlink child providers to parents,
- let parent admins access child data without duplicating accounts,
- roll up reporting across all locations,
- keep existing provider-level permission checks intact.

## Decision
Implement parent/child relationships directly on `linksy_providers` using
`parent_provider_id` and supporting RPC helpers:
- `linksy_user_can_access_provider()` for access control,
- `linksy_get_child_provider_ids()` for expansion in reporting.

API endpoints and UI components were extended to:
- manage parent/child links (`/api/admin/providers/[id]/set-parent`),
- fetch hierarchy and children,
- render a Parent/Child manager in the provider Summary tab,
- show an Organization Dashboard tab for parent orgs with aggregated metrics.

## Consequences
- Provider access checks must route through the RPC guard to ensure parent admins
  inherit child access.
- Reporting and analytics can aggregate across children without duplicating data.
- Additional UI and API surface area adds complexity but preserves existing provider
  workflows for non-parent organizations.

## Links
- `docs/GUIDES/parent-child-organizations.md`
- `supabase/migrations/20260224140000_add_parent_child_provider_linking.sql`
