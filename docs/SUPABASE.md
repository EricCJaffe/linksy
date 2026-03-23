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
- **CLI envs used operationally:** `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` (for `supabase login/link/db push` flows)
- **Note:** the current type-generation npm script expects `SUPABASE_PROJECT_ID`; if only project ref is set, export `SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_REF` for that command.

### Key Migrations

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Base multi-tenant schema (users, tenants, roles, RLS) |
| `002_setup_admin_user.sql` (+ `.template`) | Seed admin user |
| `003_add_tenant_contact_fields.sql` | Tenant contact fields |
| `003_fix_files_table_schema.sql` | Files table fixes (archived as `.bak` in `supabase/_archive/`) |
| `20240216000005_add_default_referral_handler.sql` | Default referral handler on contacts |
| `20240216000006_enhance_provider_contacts.sql` | Provider contact invitation workflow |
| `20240216000007_create_provider_events.sql` | Provider events table and RLS |
| `20240216000008_linksy_schema_security_performance.sql` | Linksy-specific security and indexes |
| `20240216000009_add_recurrence_rule_to_events.sql` | Recurrence rule support for events |
| `20260216174315_enable_extensions.sql` | Enable pgvector/PostGIS/pg_trgm |
| `20260216174000_create_sites_table.sql` | Create `sites` table and seed primary site |
| `20260216174904_linksy_providers_and_locations.sql` | Core Linksy provider + location tables |
| `20260216175036_linksy_functions_and_triggers.sql` | Search/support helper functions |
| `20260217160235_linksy_host_system.sql` | Host widget system + usage tracking |
| `20260218205438_resolve_host_return_allowed_domains.sql` | Host slug resolver + allowed domain checks |
| `20260219152656_create_linksy_provider_applications.sql` | Provider application intake schema |
| `20260224140000_add_parent_child_provider_linking.sql` | Parent/child organization linking model |
| `20260224155900_add_provider_admin_contact_types.sql` | Add `provider_admin` / `org_admin` contact types |
| `20260224160000_create_host_email_templates.sql` | Host-level email template overrides |
| `20260224160100_create_host_custom_fields.sql` | Host-specific custom fields |
| `20260225211500_restore_ticket_custom_data.sql` | Restore `linksy_tickets.custom_data` JSONB |
| `20260225223000_region_tenant_model.sql` | Create region tenants + assign providers to Impact Clay |
| `20260223120000_create_webhooks_system.sql` | Outbound webhooks tables, RLS, signing metadata |
| `20260223133000_create_email_templates.sql` | Email template override table/policies |
| `20260223160000_add_is_pinned_to_provider_notes.sql` | Optional note pinning support (safe if notes table absent) |
| `20260223181500_remap_and_cleanup_legacy_need_categories.sql` | Remap legacy categories to active AIRS taxonomy, remove unused inactive categories |
| `20260225204403_remote_schema.sql` | Remote schema sync (fixed to preserve region model columns) |
| `20260302_ticket_events_and_sla.sql` | Ticket events audit trail + SLA due date trigger |
| `20260306000003_add_duplicate_flag_to_tickets.sql` | `duplicate_flag_type` column + detection indexes on tickets |
| `20260321000001_add_phone_extension_to_locations_contacts.sql` | Phone extension fields on locations and contacts |
| `20260321000002_create_description_reviews.sql` | Provider description review system |
| `20260321000003_call_log_timer_fields.sql` | `started_at`/`ended_at` timer on call logs |
| `20260321000004_create_referral_alert_config.sql` | `linksy_referral_alert_config` table for stale referral alerts |
| `20260322000001_add_case_d_duplicate_flag.sql` | Extends duplicate flag constraint to include `case_d` |
| `20260322000002_sla_reminder_system.sql` | Per-provider SLA hours, reminder tracking, master switch |
| `20260322000003_seed_help_docs.sql` | Seed help articles (glossary, contacts, intake, referrals) |
| `20260323000001_rollup_recent_migrations.sql` | Consolidated rollup of 0321–0322 migrations (safe to run if originals already applied) |

> Full schema reference with column-level detail: `docs/AUDIT-2026-03-02.md` §Tables

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
| `linksy_resolve_host` | `app/find-help/[slug]/page.tsx`, `app/api/hosts/by-slug/[slug]/route.ts` | Resolve host provider slug + allowed domains |
| `linksy_user_can_access_provider` | `app/api/providers/[id]/*` | Enforce provider access (self, parent admin, site admin) |
| `linksy_record_ticket_event` | `app/api/tickets/[id]/*`, `app/api/admin/tickets/[id]/reassign` | Append ticket timeline events |
| `linksy_get_child_provider_ids` | `app/api/providers/[id]/hierarchy` | Get all child provider IDs for a parent |
| `is_site_admin()` | RLS policies | Check current user is site_admin (SECURITY DEFINER) |
| `is_tenant_admin(tenant_id)` | RLS policies | Check current user is tenant admin (SECURITY DEFINER) |
| `belongs_to_tenant(tenant_id)` | RLS policies | Check current user belongs to tenant (SECURITY DEFINER) |
| *(direct query)* | `api/providers/[id]/analytics/route.ts` | Aggregate `linksy_interactions` by type for provider analytics |

> Full RPC function reference with signatures and return types: `docs/AUDIT-2026-03-02.md` §RPC Functions

### Key Tables

**Linksy domain (`linksy_*`):**
- `linksy_providers` — provider records with host widget config (JSONB), embedding, LLM context card
- `linksy_locations` — provider locations with PostGIS geography column
- `linksy_needs` / `linksy_need_categories` — needs taxonomy with vector embeddings
- `linksy_provider_needs` — provider-to-need junction with source tracking
- `linksy_provider_contacts` — staff linked to providers with roles and invitation flow
- `linksy_provider_notes` — activity timeline per provider
- `linksy_tickets` / `linksy_ticket_comments` / `linksy_ticket_events` — referral management + immutable audit trail
- `linksy_events` — provider events with approval workflow + recurrence
- `linksy_search_sessions` — AI search session tracking and analytics
- `linksy_interactions` — click/call/website/directions analytics per session+provider
- `linksy_crisis_keywords` — crisis detection keywords and emergency resources
- `linksy_webhooks` / `linksy_webhook_deliveries` — tenant outbound webhook configs and delivery logs
- `linksy_email_templates` / `linksy_host_email_templates` — admin and host-level email template overrides
- `linksy_provider_applications` — public onboarding intake (5-step wizard)
- `linksy_call_logs` — call logging per ticket/provider
- `linksy_surveys` — client satisfaction surveys (token-based anonymous access)
- `linksy_host_custom_fields` — host-specific intake form fields
- `linksy_docs` — knowledge base with full-text search (TSVECTOR)
- `linksy_support_tickets` / `linksy_support_ticket_comments` — internal platform support
- `linksy_referral_alert_config` — per-site stale referral alert settings + SLA reminder master switch
- `linksy_description_reviews` — provider description review queue (quarterly auto-update)

### Migration Hygiene

- The Supabase CLI skips non-timestamp files in `supabase/migrations/` and may still show warnings.
- Keep backup files (for example `.bak`) and legacy SQL outside `supabase/migrations/` to avoid migration confusion and failed `db push` prompts.
- `APPLY_MIGRATION_FIXED.sql` is a non-timestamp file and should stay outside the migrations execution path.

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
