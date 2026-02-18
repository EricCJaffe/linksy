# Integrations

## External APIs

### OpenAI
- **Purpose:** AI-powered community resource search (embedding + conversational response)
- **Auth:** `OPENAI_API_KEY` env var (server-only, lazy-initialized)
- **Models used:**
  - `text-embedding-3-small` — query embedding for vector similarity search
  - `gpt-4o-mini` — conversational response generation from provider context cards
- **Entry point:** `app/api/linksy/search/route.ts`
- **Pattern:** Lazy client initialization via `getOpenAI()` to avoid build-time errors when key is missing

### Google Maps / Geocoding
- **Purpose:** Convert addresses to lat/lng for proximity search; generate static map images
- **Auth:** `GOOGLE_MAPS_API_KEY` (server-side geocoding), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client-side static maps)
- **Entry point:** `lib/utils/geocode.ts`
- **Graceful degradation:** Returns null if API key not configured; search still works but without distance sorting
- **Also used:** Admin geocode endpoint at `app/api/admin/geocode/route.ts`

### Resend / SMTP (Email)
- **Purpose:** Transactional email — provider contact invitations, ticket assignment notifications, ticket status updates
- **Auth:** `RESEND_API_KEY` env var (primary), or `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` (nodemailer fallback)
- **Entry point:** `lib/utils/email.ts`
- **Triggers:**
  - **New ticket created** (`POST /api/tickets`): notifies the default referral handler for the assigned provider
  - **Ticket status updated** (`PATCH /api/tickets/[id]`): notifies the client at `client_email` if present
  - **Provider contact invited** (`POST /api/providers/[id]/contacts/[contactId]/invite`): uses `supabase.auth.admin.inviteUserByEmail` (Supabase handles the email directly)
- **Dev mode:** Logs emails to console if neither Resend nor SMTP is configured (safe by default — no accidental sends)

### OpenStreetMap
- **Purpose:** Embedded map tiles on provider location cards
- **Auth:** None required (free tile embedding)
- **Entry point:** `components/providers/provider-detail-tabs.tsx` (LocationsCard)
- **CSP:** `frame-src` allows `https://www.openstreetmap.org` in `next.config.js`

## Webhooks

- No inbound or outbound webhooks are currently configured.

## Internal Services

### Supabase Auth Callback (OAuth)
- **Endpoint:** `app/auth/callback/route.ts` (note: `app/auth/`, not `app/api/auth/`)
- **Purpose:** Handles OAuth redirect from Google and Microsoft (Azure AD) after Supabase Auth flow
- **Triggers on:** successful social login
- **Flow:** Receives `?code=` param → `supabase.auth.exchangeCodeForSession(code)` → redirects to `/dashboard` on success, `/login?error=oauth_error` on failure
- **Providers configured:** Google, Microsoft (Azure) via Supabase dashboard OAuth settings

### Crisis Detection
- **Endpoint:** `app/api/crisis-keywords/test/route.ts`
- **Purpose:** Checks user messages against crisis keywords (suicide, DV, trafficking, child abuse)
- **Called by:** `FindHelpWidget` before every search query
- **Behavior:** Returns emergency resources (hotline numbers) for display in a non-dismissable banner
