# Supabase

## Client

- **Browser client:** `lib/supabase/client.ts` — singleton, uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Server client:** `lib/supabase/server.ts` → `createClient()` — cookie-based SSR client for Server Components and Route Handlers
- **Service client:** `lib/supabase/server.ts` → `createServiceClient()` — uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS for admin operations
- **Middleware client:** `lib/supabase/middleware.ts` → `updateSession()` — refreshes auth session on every request

## Auth

- **Auth provider:** Supabase Auth (email/password + OAuth)
- **Session pattern:** Cookie-based SSR sessions (via `@supabase/ssr`)
- **Membership/tenant context:** `tenant_users` table links users to tenants with role (admin/member); provider staff linked via `linksy_provider_contacts`

## Database

- **Migrations path:** `supabase/migrations/`
- **Config path:** `supabase/config.toml` (if present)
- **Type generation:** `npm run types:generate` → outputs to `lib/types/database.ts`

### Key Migrations

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Base multi-tenant schema (users, tenants, roles, RLS) |
| `002_setup_admin_user.sql.template` | Seed admin user |
| `003_add_tenant_contact_fields.sql` | Tenant contact fields |
| `003_fix_files_table_schema.sql` | Files table fixes |
| `20240216000005_add_default_referral_handler.sql` | Default referral handler on contacts |
| `20240216000006_enhance_provider_contacts.sql` | Provider contact invitation workflow |
| `20240216000007_create_provider_events.sql` | Provider events table and RLS |
| `20240216000008_linksy_schema_security_performance.sql` | Linksy-specific security and indexes |

### Extensions Used

- **pgvector** — vector similarity search on need/provider embeddings
- **PostGIS** — geographic proximity queries
- **pg_trgm** — trigram-based fuzzy text search

### RPC Functions (called from application code)

| Function | Called From | Purpose |
|----------|-----------|---------|
| `linksy_search_needs` | `api/linksy/search/route.ts` | Vector similarity search on need embeddings (threshold 0.5) |
| `linksy_nearby_provider_ids` | `api/linksy/search/route.ts` | PostGIS proximity filter within radius (ring-based: 10→25→50 mi) |
| `linksy_increment_session_usage` | `api/linksy/search/route.ts` | Track token usage per search session |
| `linksy_increment_host_usage` | `api/linksy/search/route.ts` | Track search/token usage per host provider |

### Key Tables

**Linksy domain (`linksy_*`):**
- `linksy_providers` — provider records with host widget config (JSONB), embedding, LLM context card
- `linksy_locations` — provider locations with PostGIS geography column
- `linksy_needs` / `linksy_need_categories` — needs taxonomy with vector embeddings
- `linksy_provider_needs` — provider-to-need junction with source tracking
- `linksy_provider_contacts` — staff linked to providers with roles and invitation flow
- `linksy_provider_notes` — activity timeline per provider
- `linksy_tickets` / `linksy_ticket_comments` — referral management
- `linksy_events` — provider events with approval workflow
- `linksy_search_sessions` — AI search session tracking and analytics
- `linksy_interactions` — click/call/website analytics per session+provider
- `linksy_crisis_keywords` — crisis detection keywords and emergency resources

**Base template:**
- `users` — user profiles with role
- `tenants` / `tenant_users` — multi-tenant membership
- `files` — file metadata for uploads
- `audit_logs` — action audit trail
- `notifications` — in-app notification records

## Storage Buckets

| Bucket | Access | Used For |
|--------|--------|----------|
| `tenant-uploads` | Public | Tenant logos, widget logos (`widget-logos/{providerId}/`) |
| `user-uploads` | Public | User avatars (`avatars/{userId}/`) |
| `files` | Varies | General file management |
