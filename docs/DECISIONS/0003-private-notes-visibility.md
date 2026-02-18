# 0003 Private Notes Visibility on Provider Records

## Date
2026-02-18

## Status
Planned (implementation pending)

## Context

All provider notes in `linksy_provider_notes` are currently visible to every
authenticated user who can view a provider's detail page. This creates a problem
for case workers who want to leave sensitive observations (e.g., referral outcome
issues, staff contacts) that should not be visible to other organizations that may
also view the same provider record for cross-referral purposes.

Options considered:
1. **Organization-scoped notes** — separate note records per org; no shared context
2. **Visibility flag** — single `is_private` boolean; server-side filter per viewer's relationship to the provider
3. **Full ACL** — per-note per-user permissions (overkill for current use case)

## Decision

Add `is_private BOOLEAN NOT NULL DEFAULT false` to `linksy_provider_notes`.

**Visibility rules:**
- `is_private = false` (default): visible to all authenticated users
- `is_private = true` (private): visible only to:
  - `site_admin` (any)
  - `tenant_admin` (any)
  - Users in `linksy_provider_contacts` for **that specific provider**

Filtering is applied server-side in `GET /api/providers/[id]` after fetching the contacts array
(already loaded in the same `Promise.all`). No extra DB queries are needed.

The UI shows a toggle when creating/editing a note and a lock badge on private notes.

## Consequences

- **Security:** Sensitive notes hidden from unauthorized viewers; enforcement is server-side (not RLS-only), so requires correct implementation of the filter in the API route.
- **Simplicity:** Single boolean is easy to understand and extend.
- **Limitation:** `tenant_admin` can see all private notes; there is no org-scoped privacy, only provider-contact-scoped privacy.
- **Site admin edit bypass:** The PATCH endpoint for notes is also updated to allow `site_admin` to edit any user's note (previously blocked by the user_id ownership check).

## Links
- Migration: `ALTER TABLE public.linksy_provider_notes ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false`
- `app/api/providers/[id]/route.ts` — server-side filter
- `app/api/providers/[id]/notes/route.ts` — accept `is_private` in POST
- `app/api/providers/[id]/notes/[noteId]/route.ts` — accept `is_private` in PATCH
- `components/providers/provider-detail-tabs.tsx` — toggle + badge UI
- Plan file: `.claude/plans/dazzling-hatching-puffin.md`
