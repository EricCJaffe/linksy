# Supabase Schema Reference

> Generated 2026-03-02. Source of truth: `supabase/migrations/` + `lib/types/database.ts`

## Extensions

| Extension | Purpose |
|-----------|---------|
| **pgvector** | Vector similarity search (1536-dim embeddings from `text-embedding-3-small`) |
| **PostGIS** | Geographic proximity queries (`GEOGRAPHY(POINT, 4326)`) |
| **pg_trgm** | Trigram-based fuzzy text search (GIN indexes on name fields) |

---

## Enums

| Enum | Values |
|------|--------|
| `user_role` | `site_admin`, `tenant_admin`, `user` |
| `tenant_role` | `admin`, `member` |
| `notification_type` | `info`, `success`, `warning`, `error` |
| `linksy_sector` | `nonprofit`, `faith_based`, `government`, `business` |
| `linksy_project_status` | `active`, `sustaining`, `maintenance`, `na` |
| `linksy_referral_type` | `standard`, `contact_directly` |
| `linksy_ticket_status` | `pending`, `customer_need_addressed`, `wrong_organization_referred`, `outside_of_scope`, `client_not_eligible`, `unable_to_assist`, `client_unresponsive` |
| `linksy_contact_type` | `customer`, `provider_employee`, `provider_admin`, `org_admin` |
| `linksy_event_status` | `draft`, `pending_approval`, `published`, `cancelled` |
| `linksy_note_type` | `general`, `outreach`, `update`, `internal` |
| `linksy_provider_status` | `active`, `paused`, `inactive`, `pending_approval` |
| `provider_contact_role` | `admin`, `user` |
| `provider_contact_status` | `active`, `archived`, `invited`, `pending` |

---

## Tables

### Base Multi-Tenant Tables

#### `sites`
Top-level platform entity (Impact Works). Hardcoded ID: `86bd8d01-0dc5-4479-beff-666712654104`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | |
| `slug` | TEXT UNIQUE | |
| `is_active` | BOOLEAN | default true |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

#### `users`
Extends `auth.users` with profile data. Auto-created via `handle_new_user()` trigger on auth signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK, FK `auth.users` | |
| `email` | VARCHAR(255) UNIQUE | |
| `full_name` | VARCHAR(255) | |
| `avatar_url` | TEXT | |
| `role` | `user_role` | `site_admin`, `tenant_admin`, `user` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**RLS**: Self-view, site_admin view all, peer view within shared tenant.

#### `tenants`
Regional organizations (Impact Clay, United Way of North Florida).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | VARCHAR(255) | |
| `slug` | VARCHAR(100) UNIQUE | |
| `settings` | JSONB | default `{}` |
| `branding` | JSONB | default `{}` |
| `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country` | TEXT | |
| `track_location` | BOOLEAN | default false |
| `primary_contact_id` | UUID FK `users` | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**RLS**: Site admins view all, users view own, tenant admins update own.

#### `tenant_users`
Many-to-many user-to-tenant membership.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK `tenants` CASCADE | |
| `user_id` | UUID FK `users` CASCADE | |
| `role` | `tenant_role` | `admin`, `member` |
| `created_at` | TIMESTAMPTZ | |

**Unique**: `(tenant_id, user_id)`.

#### `modules` / `tenant_modules`
Feature flags. Modules are global definitions; tenant_modules enables them per tenant.

#### `invitations`
Tenant invitations with token-based acceptance.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK CASCADE | |
| `email` | VARCHAR(255) | |
| `role` | `tenant_role` | default `member` |
| `token` | VARCHAR(255) UNIQUE | |
| `expires_at`, `accepted_at`, `created_at` | TIMESTAMPTZ | |

#### `notifications`
In-app notification records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK CASCADE | |
| `tenant_id` | UUID FK CASCADE | |
| `title` | VARCHAR(255) | |
| `message` | TEXT | |
| `type` | `notification_type` | |
| `read_at`, `created_at` | TIMESTAMPTZ | |

**RLS**: Users view/update own. System can insert.

#### `audit_logs`
Action audit trail.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK SET NULL | |
| `user_id` | UUID FK SET NULL | |
| `action` | VARCHAR(100) | |
| `entity_type` | VARCHAR(100) | |
| `entity_id` | UUID | |
| `metadata` | JSONB | default `{}` |
| `created_at` | TIMESTAMPTZ | |

#### `files`
File metadata for uploads (actual files in Supabase Storage).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK CASCADE | |
| `user_id` | UUID FK CASCADE | |
| `name` | VARCHAR(255) | |
| `path` | TEXT | |
| `size` | BIGINT | |
| `mime_type` | VARCHAR(100) | |
| `created_at` | TIMESTAMPTZ | |

---

### Linksy Domain Tables

#### `linksy_providers`
Core provider/organization records with host widget config, AI embeddings, and parent/child linking.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK `sites` CASCADE | |
| `tenant_id` | UUID FK `tenants` SET NULL | Region tenant |
| `name` | TEXT | |
| `slug` | TEXT | UNIQUE per site |
| `description` | TEXT | |
| `sector` | `linksy_sector` | |
| `project_status` | `linksy_project_status` | |
| `provider_status` | TEXT | `active`, `paused`, `inactive` |
| `is_active` | BOOLEAN | Legacy, use `provider_status` |
| `referral_type` | `linksy_referral_type` | |
| `referral_instructions` | TEXT | |
| `accepting_referrals` | BOOLEAN | default true |
| `phone`, `phone_extension`, `email`, `website` | TEXT | |
| `hours_of_operation` | TEXT | |
| `social_links` | JSONB | default `{}` |
| `service_zip_codes` | TEXT[] | null = serves all areas |
| **AI/Search** | | |
| `llm_context_card` | TEXT | Auto-generated markdown for LLM |
| `embedding` | vector(1536) | OpenAI `text-embedding-3-small` |
| `ai_summary` | TEXT | |
| `search_popularity_score` | FLOAT | default 0 |
| `click_through_rate`, `ticket_conversion_rate`, `description_quality_score` | FLOAT | |
| **Host Widget** | | |
| `is_host` | BOOLEAN | default false |
| `host_embed_active` | BOOLEAN | default true |
| `host_widget_config` | JSONB | default `{}` |
| `host_allowed_domains` | TEXT[] | |
| `host_tokens_used_this_month`, `host_searches_this_month` | INTEGER | default 0 |
| `host_monthly_token_budget` | INTEGER | |
| `host_usage_reset_at` | TIMESTAMPTZ | |
| **Parent/Child** | | |
| `parent_provider_id` | UUID FK self SET NULL | CHECK `id != parent_provider_id` |
| `parent_linked_by` | UUID FK `users` | |
| `parent_linked_at` | TIMESTAMPTZ | |
| **Timestamps** | | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Indexes**: site, (site, is_active), sector, name (trgm GIN), host_slug (filtered), embedding (IVFFlat 100 lists), parent, tenant_id, service_zip_codes (GIN).
**RLS**: Public read active, site_admin all.
**Triggers**: `updated_at`, context card auto-refresh on name/description/phone/email/website/hours changes.

#### `linksy_locations`
Provider physical locations with PostGIS geography.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `provider_id` | UUID FK CASCADE | |
| `name` | TEXT | |
| `address_line1`-`3`, `city`, `state`, `postal_code`, `county` | TEXT | |
| `country` | VARCHAR | default `US` |
| `location` | GEOGRAPHY(POINT, 4326) | PostGIS |
| `latitude`, `longitude` | FLOAT | Convenience |
| `geocoded_at` | TIMESTAMPTZ | |
| `geocode_source` | TEXT | `google`, `manual` |
| `is_primary` | BOOLEAN | default false |
| `is_active` | BOOLEAN | default true |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Indexes**: provider, geo (GIST), city, postal_code.
**RLS**: Public read active, admin write.

#### `linksy_need_categories`
Service categories (AIRS-aligned taxonomy).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK CASCADE | |
| `name` | TEXT | |
| `slug` | TEXT | UNIQUE per site |
| `description` | TEXT | |
| `airs_code` | TEXT | AIRS standards code |
| `sort_order` | INTEGER | default 0 |
| `is_active` | BOOLEAN | default true |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**RLS**: Public read active, admin write.

#### `linksy_needs`
Individual needs/services with vector embeddings for semantic search.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK CASCADE | |
| `category_id` | UUID FK CASCADE | |
| `name` | TEXT | |
| `slug` | TEXT | UNIQUE per site |
| `description` | TEXT | |
| `synonyms` | TEXT[] | |
| `is_active` | BOOLEAN | default true |
| `embedding` | vector(1536) | |
| `embedding_model` | TEXT | default `text-embedding-3-small` |
| `embedding_generated_at` | TIMESTAMPTZ | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Indexes**: site, category, name (trgm GIN), embedding (IVFFlat 50 lists).
**RLS**: Public read active, admin write.

#### `linksy_provider_needs`
Provider-to-need junction (many-to-many).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `provider_id` | UUID FK CASCADE | |
| `need_id` | UUID FK CASCADE | |
| `source` | TEXT | `manual`, `referral_derived`, `ai_suggested` |
| `is_confirmed` | BOOLEAN | default false |
| `confirmed_by` | UUID FK `auth.users` | |
| `confirmed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

**Unique**: `(provider_id, need_id)`. **RLS**: Public read, admin write.

#### `linksy_provider_contacts`
Staff linked to providers with invitation workflow.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `provider_id` | UUID FK CASCADE | |
| `user_id` | UUID FK `auth.users` CASCADE | null until invite accepted |
| `contact_type` | `linksy_contact_type` | |
| `is_primary_contact` | BOOLEAN | default false |
| `job_title`, `email`, `full_name` | TEXT | |
| `status` | TEXT | `active`, `invited`, `pending` |
| `provider_role` | TEXT | `admin`, `user` |
| `is_default_referral_handler` | BOOLEAN | |
| `invitation_accepted_at` | TIMESTAMPTZ | |
| `contact_email_preferences` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

**Unique**: `(provider_id, user_id)`.
**RLS: DISABLED** — Auth handled at API layer via `linksy_user_can_access_provider()`.
**Trigger**: `link_invited_user_to_contact()` auto-links on auth signup.

#### `linksy_provider_notes`
Activity timeline per provider.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `provider_id` | UUID FK CASCADE | |
| `author_id` | UUID FK `auth.users` | |
| `note_type` | `linksy_note_type` | |
| `content` | TEXT | |
| `author_name` | TEXT | |
| `is_private` | BOOLEAN | default false |
| `is_pinned` | BOOLEAN | default false |
| `attachments` | JSONB | default `[]` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**RLS**: Site admins or provider contacts can read/insert. Note: `is_private` not enforced at RLS level — filtered in application.

#### `linksy_tickets`
Referral tickets. Numbering: `R-<sequence>-<suffix>`, sequence starts at 2000.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK CASCADE | |
| `provider_id` | UUID FK `providers` | |
| `need_id` | UUID FK `needs` | |
| `ticket_number` | TEXT | `R-2001-07` format |
| `status` | `linksy_ticket_status` | |
| `source` | TEXT | default `manual` |
| `client_user_id` | UUID FK `users` | |
| `client_name`, `client_email`, `client_phone` | TEXT | |
| `description_of_need` | TEXT | |
| `client_perception` | `linksy_ticket_status` | |
| `follow_up_sent` | BOOLEAN | default false |
| `assigned_to` | UUID FK `users` | |
| `assigned_at` | TIMESTAMPTZ | |
| `reassignment_count` | INTEGER | default 0 |
| `last_reassigned_at` | TIMESTAMPTZ | |
| `forwarded_from_provider_id` | UUID FK `providers` | |
| `search_session_id` | UUID | |
| `sla_due_at` | TIMESTAMPTZ | Auto-set by trigger |
| `custom_data` | JSONB | default `{}` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Indexes**: site, provider, client, status, ticket_number, created DESC, assigned_to, forwarded_from, custom_data (GIN), sla_due_at.
**RLS**: Provider contacts read own, admin all.
**Triggers**: `linksy_ticket_status_change_trigger` auto-creates `linksy_ticket_events`, `linksy_set_sla_due_at`.

#### `linksy_ticket_comments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `ticket_id` | UUID FK CASCADE | |
| `author_id` | UUID FK `users` | |
| `content` | TEXT | |
| `is_private` | BOOLEAN | default false |
| `author_name`, `author_role` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**RLS**: Private comments visible only to site admins.

#### `linksy_ticket_events`
Immutable audit trail for ticket lifecycle. Append-only.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `ticket_id` | UUID FK CASCADE | |
| `event_type` | TEXT | `created`, `assigned`, `reassigned`, `forwarded`, `status_changed`, `comment_added`, `updated` |
| `actor_id` | UUID FK SET NULL | |
| `actor_type` | TEXT | `site_admin`, `provider_admin`, `provider_contact`, `system` |
| `previous_state`, `new_state` | JSONB | |
| `reason` | TEXT | `unable_to_assist`, `wrong_org`, `capacity`, `other`, `admin_reassignment`, `internal_assignment` |
| `notes` | TEXT | |
| `metadata` | JSONB | default `{}` |
| `created_at` | TIMESTAMPTZ | |

**RLS**: Site admins view all, provider contacts view own. Insert: service_role only.

#### `linksy_events`
Provider events/programs with approval workflow.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK CASCADE | |
| `provider_id` | UUID FK SET NULL | |
| `title`, `description` | TEXT | |
| `start_date`, `end_date` | TIMESTAMPTZ | |
| `is_all_day` | BOOLEAN | default false |
| `recurrence_rule` | TEXT | iCal RRULE format |
| `location_name`, `address` | TEXT | |
| `location` | GEOGRAPHY(POINT, 4326) | |
| `need_category_id` | UUID FK | |
| `tags` | TEXT[] | |
| `status` | `linksy_event_status` | |
| `submitted_by`, `approved_by` | UUID FK | |
| `published_at` | TIMESTAMPTZ | |
| `contact_name`, `contact_email`, `contact_phone`, `registration_url` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**RLS**: Public read published, provider manage own, admin all.

#### `linksy_search_sessions`
AI chatbot conversation tracking.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK CASCADE | |
| `host_provider_id` | UUID FK `providers` | null if not widget |
| `user_fingerprint` | TEXT | |
| `ip_address` | INET | |
| `initial_query` | TEXT | |
| `zip_code_searched` | TEXT | |
| `user_location` | GEOGRAPHY(POINT, 4326) | |
| `conversation_history` | JSONB | |
| `inferred_needs` | TEXT[] | |
| `total_tokens_used` | INTEGER | default 0 |
| `message_count` | INTEGER | default 0 |
| `model_used` | TEXT | |
| `created_ticket` | BOOLEAN | default false |
| `ticket_id` | UUID FK | |
| `crisis_detected` | BOOLEAN | default false |
| `crisis_type` | TEXT | |
| `services_viewed`, `services_clicked` | UUID[] | |
| `created_at`, `ended_at` | TIMESTAMPTZ | |

**RLS**: Admin read, anon insert/update.

#### `linksy_interactions`
Click/call/website analytics per session+provider.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `session_id` | UUID FK CASCADE | |
| `provider_id` | UUID FK CASCADE | |
| `need_id` | UUID FK | |
| `interaction_type` | TEXT | `profile_view`, `phone_click`, `website_click`, `directions_click` |
| `created_at` | TIMESTAMPTZ | |

**RLS**: Anon insert, admin read.

#### `linksy_crisis_keywords`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK CASCADE | |
| `keyword` | TEXT | |
| `crisis_type` | TEXT | |
| `severity` | TEXT | `low`, `medium`, `high`, `critical` |
| `response_template` | TEXT | |
| `emergency_resources` | JSONB | |
| `is_active` | BOOLEAN | default true |
| `created_at` | TIMESTAMPTZ | |

**Indexes**: (site_id, is_active), keyword (trgm GIN).

#### `linksy_webhooks` / `linksy_webhook_deliveries`
Outbound webhooks with HMAC-SHA256 signing. Events: `ticket.created`, `ticket.status_changed`.

#### `linksy_email_templates`
Global email template overrides. Keyed by `slug` (unique).

#### `linksy_host_email_templates`
Host-specific email template overrides. Unique on `(host_id, template_key)`.

#### `linksy_host_custom_fields`
Host-specific intake form fields.

#### `linksy_provider_applications`
Public onboarding intake. Status: `pending` / `approved` / `rejected`. Links to `created_provider_id` on approval.

#### `linksy_call_logs`
Call logging per ticket/provider.

#### `linksy_surveys`
Client satisfaction surveys. Token-based anonymous access.

#### `linksy_custom_fields`
Legacy provider-level custom fields. Prefer `linksy_host_custom_fields` for new work.

#### `linksy_docs`
Knowledge base with full-text search (`TSVECTOR` generated column).

#### `linksy_support_tickets` / `linksy_support_ticket_comments`
Internal platform support system.

#### `linksy_api_keys`
Widget authentication and rate limiting. Key stored as bcrypt hash with prefix for lookup.

#### `linksy_ai_prompts`
Versioned prompt management for AI models.

---

## RPC Functions

### Search & Vector

| Function | Returns | Purpose |
|----------|---------|---------|
| `linksy_search_needs(embedding, threshold, count, site_id)` | TABLE | Cosine similarity search on need embeddings |
| `linksy_nearby_provider_ids(lat, lng, radius_meters)` | SETOF UUID | PostGIS proximity filter (SECURITY DEFINER) |
| `linksy_search_providers_nearby(lat, lng, radius_miles, need_id, site_id, limit)` | TABLE | Full provider proximity search with need filter |
| `linksy_generate_context_card(provider_id)` | TEXT | Build markdown context card from provider data |
| `linksy_check_crisis(message, site_id)` | TABLE | ILIKE keyword matching for crisis detection |

### Host Widget

| Function | Returns | Purpose |
|----------|---------|---------|
| `linksy_resolve_host(slug)` | TABLE | Resolve host by slug, check budget (SECURITY DEFINER) |
| `linksy_increment_host_usage(host_id, tokens)` | void | Atomic token/search counter with 30-day reset (SECURITY DEFINER) |

### Session Tracking

| Function | Returns | Purpose |
|----------|---------|---------|
| `linksy_increment_session_usage(session_id, tokens)` | void | Atomic token + message count update (SECURITY DEFINER) |
| `linksy_add_service_clicked(session_id, provider_id)` | void | Append provider to services_clicked array (SECURITY DEFINER) |

### Access Control

| Function | Returns | Purpose |
|----------|---------|---------|
| `linksy_user_can_access_provider(user_id, provider_id)` | BOOLEAN | Check direct or parent-admin access |
| `linksy_get_child_provider_ids(parent_id)` | UUID[] | Get all child provider IDs |
| `is_site_admin()` | BOOLEAN | Check current user is site_admin (SECURITY DEFINER) |
| `is_tenant_admin(tenant_id)` | BOOLEAN | Check current user is tenant admin (SECURITY DEFINER) |
| `belongs_to_tenant(tenant_id)` | BOOLEAN | Check current user belongs to tenant (SECURITY DEFINER) |

### Ticket Events

| Function | Returns | Purpose |
|----------|---------|---------|
| `linksy_record_ticket_event(ticket_id, event_type, actor_id, ...)` | UUID | Append immutable event to ticket audit trail (SECURITY DEFINER) |
| `linksy_ticket_status_change_trigger()` | TRIGGER | Auto-create `status_changed` event on ticket update |
| `linksy_set_sla_due_at()` | TRIGGER | Auto-calculate SLA due date on ticket insert |

### Auth & Lifecycle

| Function | Returns | Purpose |
|----------|---------|---------|
| `handle_new_user()` | TRIGGER | Auto-create `users` row on `auth.users` insert |
| `link_invited_user_to_contact()` | TRIGGER | Auto-link new auth user to pending provider contact |
| `enforce_single_default_referral_handler()` | TRIGGER | Ensure one default handler per provider |

---

## RPC Usage by API Route

| Route | Functions Called |
|-------|----------------|
| `api/linksy/search` | `linksy_search_needs`, `linksy_nearby_provider_ids`, `linksy_increment_session_usage`, `linksy_increment_host_usage` |
| `api/linksy/interactions` | `linksy_add_service_clicked` |
| `api/crisis-keywords/test` | `linksy_check_crisis` |
| `find-help/[slug]` (SSR) | `linksy_resolve_host` |
| `api/hosts/by-slug/[slug]` | `linksy_resolve_host` |
| `api/providers/[id]/*` | `linksy_user_can_access_provider` |
| `api/providers/[id]/hierarchy` | `linksy_get_child_provider_ids` |
| `api/tickets/[id]/*` | `linksy_record_ticket_event` |
| `api/admin/tickets/[id]/reassign` | `linksy_record_ticket_event` |

---

## Key Indexes

### Vector (Approximate Nearest Neighbor)
| Index | Table | Type | Config |
|-------|-------|------|--------|
| `idx_linksy_needs_embedding` | `linksy_needs` | IVFFlat cosine | 50 lists |
| `idx_linksy_providers_embedding` | `linksy_providers` | IVFFlat cosine | 100 lists |

### Geospatial
| Index | Table | Type |
|-------|-------|------|
| `idx_linksy_locations_geo` | `linksy_locations` | GIST |
| `idx_linksy_events_geo` | `linksy_events` | GIST |

### Text Search
| Index | Table | Type |
|-------|-------|------|
| `idx_linksy_needs_name_trgm` | `linksy_needs` | GIN trigram |
| `idx_linksy_providers_name_trgm` | `linksy_providers` | GIN trigram |
| `idx_linksy_crisis_keyword` | `linksy_crisis_keywords` | GIN trigram |
| `linksy_docs_fts_idx` | `linksy_docs` | GIN tsvector |

### Array
| Index | Table | Column |
|-------|-------|--------|
| `idx_linksy_providers_service_zip_codes` | `linksy_providers` | GIN |
| `idx_tickets_custom_data` | `linksy_tickets` | GIN |

---

## RLS Security Audit

### Issues Found

| Severity | Table | Issue |
|----------|-------|-------|
| **HIGH** | `linksy_provider_contacts` | RLS disabled entirely. Auth handled at API layer. Risk: any misuse of non-service-client could expose all contacts. |
| **HIGH** | `linksy_provider_notes` | `is_private` not enforced at RLS level. Private notes could leak to non-admin provider staff if application filtering is bypassed. |
| **MEDIUM** | `linksy_tickets` | No client-view policy. Clients who submitted referrals via widget cannot query their own ticket status. |
| **MEDIUM** | `linksy_call_logs` | Overly permissive: any authenticated user can manage any call log, not just their own provider's. |
| **MEDIUM** | `linksy_custom_fields` | Any authenticated user can manage any provider's custom fields. Should be scoped like `linksy_host_custom_fields`. |
| **MEDIUM** | `linksy_surveys` | Unrestricted UPDATE: any authenticated user can modify any survey result. |
| **LOW** | `linksy_search_sessions` | Anon update policy has no row-level filter. One session could theoretically modify another. |

### Recommendations

1. Re-enable RLS on `linksy_provider_contacts` with proper provider-scoped policies
2. Add `is_private = false` condition to `linksy_provider_notes` RLS for non-admin reads
3. Add client-email-based ticket view policy for `linksy_tickets`
4. Restrict `linksy_call_logs` to provider contacts for their own provider's tickets
5. Scope `linksy_custom_fields` to provider contacts (match `linksy_host_custom_fields` pattern)

---

## Relationships Diagram (Key FKs)

```
sites ─────────────────────── linksy_providers
                              ├── linksy_locations
                              ├── linksy_provider_needs ── linksy_needs ── linksy_need_categories
                              ├── linksy_provider_contacts ── auth.users ── users
                              ├── linksy_provider_notes
                              ├── linksy_tickets
                              │   ├── linksy_ticket_comments
                              │   ├── linksy_ticket_events
                              │   ├── linksy_call_logs
                              │   └── linksy_surveys
                              ├── linksy_events
                              ├── linksy_host_email_templates
                              ├── linksy_host_custom_fields
                              └── parent_provider_id (self-ref)

tenants ── tenant_users ── users
        ── linksy_webhooks ── linksy_webhook_deliveries

linksy_search_sessions ── linksy_interactions
```

---

## Storage Buckets

| Bucket | Access | Used For |
|--------|--------|----------|
| `tenant-uploads` | Public | Tenant logos, widget logos (`widget-logos/{providerId}/`) |
| `user-uploads` | Public | User avatars (`avatars/{userId}/`) |
| `files` | Varies | General file management, note attachments |
