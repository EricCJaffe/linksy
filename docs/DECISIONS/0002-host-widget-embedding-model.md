# 0002 Host Widget Embedding Model

## Date
2024-02-16

## Status
Accepted

## Context

External organizations (host providers) need to embed the Linksy resource search widget on
their own websites. We needed to decide how the widget is delivered, authenticated, and
customized.

Options considered:
1. **JavaScript snippet with API key** (`<script data-api-key="lk_...">`) — standard SaaS widget pattern, shadow DOM isolation
2. **iframe embed** — simpler, full style isolation, no JS injection risks
3. **Both** — iframe now, JS embed later

## Decision

We chose **iframe-first** with a dedicated route per host provider:

- Each host provider gets a unique URL: `/find-help/{provider-slug}`
- The page is a full Next.js route (`app/find-help/[slug]/page.tsx`) that loads the `FindHelpWidget` component
- Host providers embed it via: `<iframe src="https://linksy.app/find-help/{slug}" ...>`
- Widget appearance is controlled by `host_widget_config` (JSONB column on `linksy_providers`)
- Config includes: `bot_name`, `welcome_message`, `primary_color`, `secondary_color`, `header_bg_color`, `font_family`, `logo_url`, `search_radius_miles`
- Usage tracking is per-provider: `host_tokens_used_this_month`, `host_searches_this_month`, `host_monthly_token_budget`
- No API key system is required for the iframe approach — the slug is the identifier

Host settings are managed by site admins at `/dashboard/providers/[id]` → Host Settings tab, and by provider staff at `/dashboard/my-organization` → Host Settings tab.

## Consequences

- **Simplicity:** No JavaScript SDK to build or maintain. No CORS or shadow DOM complexity.
- **Style isolation:** iframe provides complete CSS isolation by default.
- **SEO:** The `/find-help/[slug]` pages are crawlable if desired.
- **Limitation:** `X-Frame-Options: SAMEORIGIN` in `next.config.js` currently blocks cross-origin embedding. This must be relaxed (per-route or via `frame-ancestors` CSP) before hosts can embed the iframe on their own domains.
- **Limitation:** No per-domain allowlisting is enforced at the widget level (the `host_allowed_domains` column exists on `linksy_providers` but is not checked in the route).
- **Future:** A JavaScript embed (`widget.js`) with API key auth is planned for Phase 2 to support more advanced embedding scenarios.

## Links
- `app/find-help/[slug]/page.tsx` — widget page route
- `components/widget/find-help-widget.tsx` — widget UI component
- `components/widget/widget-preview.tsx` — admin preview component
- `components/providers/provider-detail-tabs.tsx` — HostSettingsTab
- `next.config.js` — CSP and X-Frame-Options headers
