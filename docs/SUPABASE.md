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
- **Config path:** no `supabase/config.toml` found in this repo
- **Type generation:** `npm run types:generate` → outputs to `lib/types/database.ts`

### Key Migrations

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Base multi-tenant schema (users, tenants, roles, RLS) |
| `002_setup_admin_user.sql` (+ `.template`) | Seed admin user |
| `003_add_tenant_contact_fields.sql` | Tenant contact fields |
| `003_fix_files_table_schema.sql` | Files table fixes |
| `20240216000005_add_default_referral_handler.sql` | Default referral handler on contacts |
| `20240216000006_enhance_provider_contacts.sql` | Provider contact invitation workflow |
| `20240216000007_create_provider_events.sql` | Provider events table and RLS |
| `20240216000008_linksy_schema_security_performance.sql` | Linksy-specific security and indexes |
| `20240216000009_add_recurrence_rule_to_events.sql` | Recurrence rule support for events |
| `20260223120000_create_webhooks_system.sql` | Outbound webhooks tables, RLS, signing metadata |
| `20260223133000_create_email_templates.sql` | Email template override table/policies |
| `20260223160000_add_is_pinned_to_provider_notes.sql` | Optional note pinning support (safe if notes table absent) |
| `20260223181500_remap_and_cleanup_legacy_need_categories.sql` | Remap legacy categories to active AIRS taxonomy, remove unused inactive categories |

### Extensions Used

- **pgvector** — vector similarity search on need/provider embeddings
- **PostGIS** — geographic proximity queries
- **pg_trgm** — trigram-based fuzzy text search

### RPC Functions (called from application code)

| Function | Called From | Purpose |
|----------|-----------|---------|
| `linksy_search_needs` | `api/linksy/search/route.ts` | Vector similarity search on need embeddings (threshold 0.5) |
| `linksy_nearby_provider_ids` | `api/linksy/search/route.ts` | PostGIS proximity filter within radius (ring-based: 10→25→50 mi) |
| `linksy_increment_session_usage` | `api/linksy/search/route.ts` | Track token usage per search session (fire-and-forget) |
| `linksy_increment_host_usage` | `api/linksy/search/route.ts` | Track search/token usage per host provider (fire-and-forget) |
| `linksy_add_service_clicked` | `api/linksy/interactions/route.ts` | Increment click count on provider for a session (fire-and-forget) |
| `linksy_check_crisis` | `api/crisis-keywords/test/route.ts` | Crisis keyword detection |
| *(direct query)* | `api/providers/[id]/analytics/route.ts` | Aggregate `linksy_interactions` by type for provider analytics |

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
- `linksy_webhooks` / `linksy_webhook_deliveries` — tenant outbound webhook configs and delivery logs
- `linksy_email_templates` — admin-editable email template overrides

### Migration Hygiene

- The Supabase CLI skips non-timestamp files in `supabase/migrations/` and may still show warnings.
- Keep backup files (for example `.bak`) and legacy SQL outside `supabase/migrations/` to avoid migration confusion and failed `db push` prompts.

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
