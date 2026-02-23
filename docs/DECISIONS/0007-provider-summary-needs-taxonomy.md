# 0007 Provider Summary Needs Taxonomy

## Date
2026-02-23

## Status
Accepted

## Context
The legacy Summary page used one-at-a-time need assignment and did not expose category-level intent. That created friction for provider editing and made AI matching context less explicit during provider maintenance.

## Decision
Use active needs taxonomy on the Provider Summary page as the primary editing surface for service coverage:
- In edit mode, users select one or more categories and one or more needs under each category.
- Category selection toggles all needs in that category.
- Changes are persisted as diff-based updates to `linksy_provider_needs` on save.
- In view mode, render assigned needs grouped by category.

## Consequences
- Better authoring flow for provider staff and admins.
- Cleaner AI guidance signal from explicit category + need coverage.
- Summary tab becomes the canonical place for maintaining service coverage.
- Follow-on: finalize copy/placement distinctions between `Needs` and `Needs Addressed` labels.

## Links
- `components/providers/provider-detail-tabs.tsx`
- `docs/CONTEXT.md`
- `docs/TASKS.md`
