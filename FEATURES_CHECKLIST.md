# Linksy Features & Requirements Checklist

> Complete inventory of all features discussed during planning sessions.
> Last audited against codebase: 2026-03-03.

---

## 1. DATABASE & INFRASTRUCTURE

### 1.1 Extensions & Core Setup
- [x] pgvector extension enabled
- [x] PostGIS extension enabled
- [x] pg_trgm extension enabled
- [x] Site record created for Linksy (Clay County)

### 1.2 Schema Tables (15 linksy_* tables)
- [x] `linksy_need_categories` — 18 categories with slug, sort_order, airs_code placeholder
- [x] `linksy_needs` — 85 needs with synonyms TEXT[], vector(1536) embedding column
- [x] `linksy_providers` — with sector enum, referral_type, llm_context_card, ai_summary, embedding, search quality metrics
- [x] `linksy_locations` — PostGIS GEOGRAPHY(POINT, 4326), geocode fields
- [x] `linksy_provider_needs` — junction with source tracking (manual/referral_derived/ai_suggested) and is_confirmed
- [x] `linksy_provider_contacts` — links auth.users to providers with contact_type enum and job_title
- [x] `linksy_provider_notes` — timeline/activity log with note_type enum (general/outreach/update/internal)
- [x] `linksy_tickets` — with ticket_number, status enum, client snapshot fields, source tracking
- [x] `linksy_ticket_comments` — with is_private flag, author_role field
- [x] `linksy_events` — with approval workflow status, PostGIS location, recurrence_rule, tags
- [x] `linksy_search_sessions` — conversation tracking, token usage, crisis detection flags
- [x] `linksy_crisis_keywords` — keyword, crisis_type, severity, response_template, emergency_resources JSONB
- [x] `linksy_api_keys` — key_hash, allowed_domains, rate limiting, widget_config JSONB, subscription_status
- [x] `linksy_ai_prompts` — versioned prompts with model_name, temperature, A/B testing support
- [x] `linksy_interactions` — analytics: view/click/call/direction/website per session+provider

### 1.3 Enums (7)
- [x] `linksy_sector` (nonprofit, faith_based, government, business)
- [x] `linksy_project_status` (active, sustaining, maintenance, na)
- [x] `linksy_referral_type` (standard, contact_directly)
- [x] `linksy_ticket_status` (pending, customer_need_addressed, wrong_organization_referred, outside_of_scope, client_not_eligible, unable_to_assist, client_unresponsive)
- [x] `linksy_contact_type` (customer, provider_employee)
- [x] `linksy_event_status` (draft, pending_approval, published, cancelled)
- [x] `linksy_note_type` (general, outreach, update, internal)

### 1.4 RPC Functions
- [x] `linksy_search_needs()` — vector similarity search on needs embeddings
- [x] `linksy_search_providers_nearby()` — PostGIS proximity + need filter, returns llm_context_cards
- [x] `linksy_generate_context_card()` — builds markdown from provider+location+needs data
- [x] `linksy_check_crisis()` — ILIKE keyword scan returning crisis_type, severity, resources

### 1.5 Triggers
- [x] Auto `updated_at` on providers, locations, need_categories, needs, tickets, events
- [x] Auto `llm_context_card` regeneration on provider field changes

### 1.6 Row Level Security
- [x] Public read on: need_categories, needs, providers, locations, provider_needs, published events
- [x] Admin-only write on all linksy_* tables (using users.role = 'site_admin')
- [x] Provider staff can: read own contacts, read assigned tickets, manage own events, read/write own notes
- [x] Anonymous insert on: search_sessions, interactions (widget usage)
- [x] Private ticket comments visible only to site admins
> Note: RLS hardening migration (`20260303000002_rls_security_hardening.sql`) written 2026-03-03; pending Supabase apply.

### 1.7 Indexes
- [x] GIN trigram indexes on provider name, needs name, crisis keywords
- [x] IVFFlat indexes on needs embedding and providers embedding
- [x] GIST indexes on locations geography and events geography
- [x] B-tree indexes on all foreign keys, status columns, created_at

---

## 2. DATA MIGRATION (Power Apps → Supabase)

### 2.1 Import Scripts
- [x] Site record creation (Clay County)
- [x] Need categories import (18 from ic_needcategories.csv)
- [x] Needs import (85 from ic_needs.csv, parse synonyms into TEXT[])
- [x] Providers import (167 parent accounts from accounts.csv)
  - [x] Enum mapping: ic_sector codes → linksy_sector values
  - [x] Enum mapping: ic_projectstatus codes → linksy_project_status values
  - [x] NON-REFERRAL accounts: strip text from name, set referral_type=contact_directly, preserve instructions
  - [x] Child accounts (12): store as notes/services on parent, not separate providers
  - [x] Slug generation from provider names
  - [x] Social links aggregation into JSONB (facebook, instagram, linkedin, youtube)
- [x] Locations import (from account address fields)
  - [x] Parse address_line1, city, state, postal_code
  - [x] Set is_primary=true for each provider's main location
- [x] Provider-needs mapping (from referral history — which org served which need)
  - [x] Source tagged as 'referral_derived'
- [x] Tickets import (681 from ic_referrals.csv)
  - [x] Enum mapping: ic_statusofreferral codes → linksy_ticket_status values
  - [x] Client snapshot fields (name, email, phone)
  - [x] Legacy referral number preservation
- [x] Ticket comments extraction (from ic_customercomments and ic_providercomments fields)
- [x] Legacy ID preservation in all tables for traceability

### 2.2 Post-Import Data Enhancement
- [x] Geocode all provider addresses (Google Maps API)
- [x] Generate embeddings for all 85 needs (name + synonyms → OpenAI text-embedding-3-small)
- [x] Generate embeddings for all 167 providers (description → OpenAI text-embedding-3-small)
- [x] Generate llm_context_cards for all providers (via linksy_generate_context_card function)
- [x] Generate ai_summary for all providers (2-3 sentence LLM summary)
- [x] Seed crisis keywords (suicide, domestic violence, trafficking, child abuse keywords + 988/hotline resources)
- [x] Create initial AI prompt versions (search, crisis_detection, ticket_intake, context_card)

### 2.3 Manual Data (Needs Addressed panel — Eric's checklist)
- [x] Import provider-needs from Dynamics 365 "Needs Addressed" panel for 72 zero-referral orgs
- [x] Source tagged as 'manual', is_confirmed=true
- [x] Merge with referral-derived mappings (dedup on provider_id + need_id)

---

## 3. ADMIN DASHBOARD

### 3.1 Layout & Navigation
- [x] Authenticated dashboard layout with sidebar navigation
- [x] Left nav sections: Providers, Contacts, Tickets, Events (under main); Needs Management (under Admin); Analytics, Settings (under System)
- [x] Breadcrumb navigation
- [x] User avatar + role display in header
- [x] Mobile-responsive sidebar (collapsible)

### 3.2 Provider Management
- [x] **List View**
  - [x] Searchable table with columns: name, sector, phone, referral_type, status, referral count
  - [x] Filter by: sector (nonprofit/faith_based/government/business), project_status, referral_type, is_active, **organization_type (all/parent/child/standalone)**
  - [x] Sort by: name, referral count, created date
  - [x] Bulk actions: activate, deactivate, export CSV
  - [x] "Add Provider" button
  - [x] Pagination
  - [x] **Child location badge** indicator for providers linked to a parent
- [x] **Detail View** (tabbed interface)
  - [x] **Breadcrumbs** — Shows parent > child hierarchy for child locations
  - [x] **Quick Switcher** — Dropdown to navigate between parent and all children
  - [x] **Summary Tab**
    - [x] Provider name (editable)
    - [x] Sector badge
    - [x] Website link (clickable)
    - [x] Phone, email, phone extension
    - [x] Hours of operation
    - [x] **Organization Structure card** — Parent/child linking controls (site admin only)
      - [x] Display current parent with link (if child)
      - [x] Display list of children with status badges (if parent)
      - [x] Link to parent button with search dialog
      - [x] Unlink from parent button
      - [x] Validation: prevent circular references and multi-level nesting
    - [x] Description (rich text editor)
    - [x] "Allow Auto Update of Description" toggle
    - [x] Needs Addressed panel (sidebar or section showing linked needs with add/remove)
  - [x] **Organization Dashboard Tab** (for parent orgs only)
    - [x] Date range filter with from/to date inputs and apply/clear buttons
    - [x] Summary cards: Total Locations, Total Referrals, Total Interactions, Events
    - [x] Engagement breakdown: Profile Views, Phone Clicks, Website Clicks, Directions Clicks
    - [x] Additional metrics: Notes & Activity, Physical Locations
    - [x] **Location Performance Breakdown table** with bulk operations
      - [x] Checkboxes for selecting child locations
      - [x] Bulk actions: Activate, Deactivate, Pause
      - [x] Columns: Location, Status, Referrals, Interactions, Events, Notes, Addresses
      - [x] Parent row (highlighted)
      - [x] Children rows with drill-down links
      - [x] Totals row (bold, aggregated)
  - [x] **Contacts Tab**
    - [x] List of linked staff users with name, email, job title, is_primary badge
    - [x] Add/remove contact links (admin only)
    - [x] Permission enforcement:
      - [x] Regular users: can only edit own contact (job_title, phone)
      - [x] Provider admins: can manage all contacts (add, edit, archive)
      - [x] Site admins: full control over all contacts
    - [x] Edit restrictions for own contact (dialog shows limited fields only)
  - [x] **Host Settings Tab** (conditionally shown)
    - [x] Only visible when `is_host = true` AND user is admin
    - [x] Enable Widget Hosting toggle (site admin only)
    - [x] Embed Active toggle (provider admin can edit)
    - [x] Widget URL display with copy buttons
    - [x] Token budget configuration
    - [x] Domain restrictions (allowed_domains)
    - [x] Usage metrics display
  - [x] **Details Tab**
    - [x] Social media links (Facebook, Instagram, LinkedIn, YouTube)
    - [x] Project status dropdown
    - [x] Referral type toggle (standard / contact_directly)
    - [x] Referral instructions text field (shown when contact_directly)
    - [x] Legacy ID display (read-only)
    - [x] Search quality metrics display (popularity score, CTR, conversion rate)
  - [x] **Tickets Tab**
    - [x] Filtered ticket list for this provider
    - [x] Status badges, client name, need, date
    - [x] Click through to ticket detail
  - [x] **Events Tab**
    - [x] Events submitted by or associated with this provider
    - [x] Status badges (draft/pending/published/cancelled)
    - [x] Click through to event detail
  - [x] **Notes/Timeline Tab**
    - [x] Chronological activity feed
    - [x] Each note shows: author name, note_type badge, content, timestamp
    - [x] "Add Note" form with type selector (general/outreach/update/internal)
    - [x] Search/filter notes
  - [x] Auto-save or explicit save button that triggers llm_context_card regeneration
  - [x] "View LLM Context Card" preview (shows the generated markdown)

### 3.3 Needs Taxonomy Management
- [x] **Category List View**
  - [x] All 18 categories with need count per category
  - [ ] Drag-to-reorder (updates sort_order)
  - [x] Add/edit/deactivate categories
  - [x] AIRS code field (placeholder for future mapping)
- [x] **Needs Under Category**
  - [x] Expandable or drill-down list of needs per category
  - [x] Each need shows: name, synonym count, provider count, is_active
  - [x] Click to edit: name, description, synonyms
- [x] **Synonym Management**
  - [x] Tag-style input for adding/removing synonyms per need
  - [x] "Regenerate Embedding" button (re-embeds after synonym changes)
  - [x] Preview: shows what text will be embedded

### 3.4 Ticket Management
- [x] **List View**
  - [x] Searchable table: ticket_number, client_name, provider, need, status, date
  - [x] Filter by: status, provider, need, date range, source
  - [x] Status color-coded badges
  - [x] Sort by: date, status, provider
  - [x] Pagination
- [x] **Detail View**
  - [x] Client info section: name, email, phone
  - [x] Assigned provider (with link to provider detail)
  - [x] Assigned need
  - [x] Description of need
  - [x] Status dropdown (editable)
  - [x] Client perception field
  - [x] Follow-up sent toggle
  - [x] Source badge (manual/chatbot/widget/phone)
  - [ ] If source=chatbot: link to search session
- [x] **Comments Section**
  - [x] Chronological comment thread
  - [x] Each comment shows: author name, role badge, timestamp, content
  - [x] "Add Comment" form with private toggle checkbox
  - [x] Private comments visually distinguished (e.g., yellow background, lock icon)
  - [x] Private comments only visible to site_admin users
- [x] **Create Ticket Form**
  - [x] Client info fields (name, email, phone)
  - [x] Provider selector (searchable dropdown)
  - [x] Need selector (searchable dropdown, grouped by category)
  - [x] Description text area
  - [x] Auto-generates ticket_number

### 3.5 Events Management
- [x] **Approval Queue**
  - [x] List of events with status=pending_approval
  - [x] Quick approve/reject actions
  - [x] Preview event details before approving
- [x] **Calendar View**
  - [x] Monthly calendar showing published events
  - [ ] Color-coded by need category
  - [x] Click event to view/edit
- [x] **List View**
  - [x] All events with filters: status, provider, date range, category
  - [x] Status badges
- [x] **Create/Edit Event**
  - [x] Title, description
  - [x] Provider selector (optional — site-wide events have no provider)
  - [x] Start date/time, end date/time, all-day toggle
  - [x] Location name, address
  - [x] Need category selector
  - [x] Tags (multi-select or free-form)
  - [x] Contact info (name, email, phone)
  - [x] Registration URL
  - [x] Status workflow: draft → pending_approval → published / cancelled
  - [x] Recurrence rule (iCal RRULE support: Daily/Weekly/Bi-weekly/Monthly/Annually)

### 3.6 Analytics Dashboard
- [x] **Search Analytics**
  - [x] Total searches over time (line chart)
  - [x] Searches by need category (bar chart)
  - [x] Top searched terms
  - [x] Average messages per session
  - [x] Token usage over time
- [x] **Provider Analytics**
  - [x] Most viewed providers
  - [x] Click-through rates per provider
  - [x] Ticket conversion rates
  - [x] Search-to-referral funnel
- [x] **Crisis Alerts**
  - [x] Crisis detection count over time
  - [x] Crisis type breakdown (pie chart)
  - [x] Recent crisis sessions (table with timestamp, type, message snippet)
- [x] **Widget Analytics**
  - [x] Usage per host
  - [x] Queries this month vs limit
  - [x] Active widgets count
  - [x] Geographic distribution of searches
- [x] **Ticket Analytics**
  - [x] Tickets by status (stacked bar)
  - [x] Resolution rate over time
  - [x] Average time to resolution
  - [x] Top providers by ticket volume

### 3.7 Settings
- [ ] **API Key Management** (not implemented — using host-slug model instead)
  - [ ] List of API keys with: name, prefix, status, last_used, queries_this_month
  - [ ] Create new key: name, allowed_domains, rate_limit_per_hour, monthly_query_limit
  - [ ] Revoke key (soft delete — is_active=false)
  - [ ] Widget config per key: welcome_message, primary_color, logo_url, bot_name
  - [ ] Copy embed snippet (JS code for customer to paste on their site)
  > Note: Widget auth uses host-slug + domain validation rather than API keys. See §5.7 Host-Specific Widget URLs.
- [x] **Crisis Keyword Management**
  - [x] List of keywords with: keyword, crisis_type, severity, is_active
  - [x] Add/edit/deactivate keywords
  - [x] Response template editor per keyword
  - [x] Emergency resources editor (phone, name, URL)
  - [x] Test: input a message and see if crisis is detected
- [ ] **AI Prompt Management** (table exists, no admin UI)
  - [ ] List of prompt types: search, crisis_detection, ticket_intake, context_card
  - [ ] Version history per prompt type
  - [ ] Edit prompt text, model, temperature, max_tokens
  - [ ] Activate/deactivate versions
  - [ ] Performance score tracking (future)
  - [ ] Test: input a query and see prompt output
- [x] **Widget Customization**
  - [x] Default widget appearance settings
  - [x] Preview widget with current settings
  - [x] Welcome message editor
  - [x] Color theme picker
  - [x] Logo upload

---

## 4. PROVIDER PORTAL

- [x] Provider staff login (via linksy_provider_contacts → auth.users)
- [x] View own organization profile
- [x] Edit limited fields (hours, contact info, description — if allowed)
- [x] View tickets assigned to their organization
- [x] Update ticket status, add comments (non-private only)
- [x] Submit events for approval
- [x] View own provider analytics (views, clicks, referrals)
- [x] Notification when new ticket is assigned

---

## 5. PUBLIC WIDGET / CHATBOT

### 5.1 Embed Infrastructure
- [x] JavaScript embed snippet (`public/widget.js` using `data-slug` attribute)
- [x] Widget loads in iframe (style isolation)
- [x] Host validation on load (is_host, is_active, host_embed_active, allowed_domains)
- [x] Domain restriction via Referer header + `host_allowed_domains`
> Note: Uses host-slug model rather than API key auth. See §5.7.

### 5.2 Widget UI
- [x] Full-page chat interface (embedded via iframe)
- [x] Chat interface with message bubbles (user + bot)
- [x] Configurable welcome message
- [x] Configurable colors, logo, bot name (from host_widget_config JSONB)
- [x] Loading states (typing indicator while AI responds)
- [x] Mobile responsive
- [ ] Accessibility: full keyboard navigation, screen reader support, ARIA labels

### 5.3 Conversation Flow
- [x] User types natural language query
- [x] Optional location prompt: "What's your zip code?"
- [x] AI processes query through hybrid search pipeline:
  1. Crisis check (before anything else)
  2. Embed query → pgvector search on needs
  3. Match needs → providers via provider_needs
  4. PostGIS proximity filter (if location provided)
  5. Return top 3-5 provider context cards to LLM
  6. LLM generates natural response
- [x] Provider result cards displayed inline:
  - [x] Organization name
  - [x] Phone number (click-to-call on mobile)
  - [x] Address (click for directions)
  - [x] Hours of operation
  - [x] Website link
  - [x] Distance from user (if location provided)
  - [x] Services/needs tags
  - [x] "Contact Directly" badge for contact_directly providers
- [x] Follow-up questions supported (multi-turn conversation)
- [x] "Create a referral" option (generates a ticket)
- [x] Session ends after inactivity or user closes widget

### 5.4 Crisis Detection
- [x] Runs on EVERY user message before search
- [x] Uses linksy_check_crisis() function
- [x] On detection: immediately show emergency banner
  - [x] Banner: red/urgent styling, non-dismissable for 5 seconds
  - [x] Shows: crisis resource name, phone number (click-to-call), URL
  - [x] Example: "If you or someone you know is in crisis, call 988 (Suicide & Crisis Lifeline)"
- [x] Logs crisis_detected=true and crisis_type on search session
- [x] Normal search continues after crisis resources shown
- [x] Crisis types: suicide, domestic_violence, trafficking, child_abuse

### 5.5 Session Tracking & Analytics
- [x] Create linksy_search_sessions record on first message
- [x] Track: initial_query, zip_code, conversation_history, inferred_needs
- [x] Count: total_tokens_used, message_count
- [x] Track interactions: which providers viewed, clicked, called, directions, website
- [x] Track: whether session resulted in a ticket creation
- [x] Anonymous: user_fingerprint for session continuity, no PII stored

### 5.6 Rate Limiting
- [x] Per-host rate limiting (host_monthly_token_budget)
- [x] Monthly usage cap (host_tokens_used_this_month)
- [x] Graceful degradation: show message when limit reached
- [x] Usage counter increment on each query
> Note: Uses host-based budgets rather than per-API-key rate limiting.

### 5.7 Host-Specific Widget URLs (Alternative to API Key Auth)
- [x] **Dynamic Route** `/find-help/[provider-slug]`
  - [x] Server-side rendering with `dynamic = 'force-dynamic'`
  - [x] Accepts any provider slug without pre-generation at build time
  - [x] RPC function `linksy_resolve_host(p_slug)` validates host status
- [x] **Host Requirements**
  - [x] Provider must have `is_host = true`
  - [x] Provider must have `is_active = true`
  - [x] Provider must have `host_embed_active = true`
- [x] **Domain Restrictions**
  - [x] Optional `host_allowed_domains` array
  - [x] Referer header validation for iframe embeds
  - [x] Direct navigation always allowed (preview mode)
  - [x] Unauthorized domains show error message
- [x] **Token Budget**
  - [x] `host_monthly_token_budget` limits usage
  - [x] `host_tokens_used_this_month` tracking
  - [x] Over-budget displays unavailable message
  - [x] Auto-reset at period boundary
- [x] **Widget Configuration**
  - [x] `host_widget_config` JSONB for customization
  - [x] Widget URL displayed in Host Settings tab
  - [x] Iframe embed snippet with copy button
- [x] **Analytics Tagging**
  - [x] All sessions tagged with `host_provider_id`
  - [x] Usage tracked separately from API key widgets

---

## 6. API ENDPOINTS

### 6.1 Widget API (Public — host-slug authenticated)
- [x] `POST /api/linksy/search` — Send message, get AI response (includes session creation)
- [x] `POST /api/linksy/interactions` — Track view/click/call events
- [x] `POST /api/linksy/tickets` — Create ticket from widget
> Note: Uses host-slug model at `/api/linksy/*` rather than `/api/widget/*` paths.

### 6.2 Admin API (Authenticated — requires site_admin role)
- [x] CRUD endpoints for: providers, needs, categories, tickets, events, notes
- [x] `POST /api/admin/linksy/context-cards` — Bulk regenerate LLM context cards
- [x] `GET /api/stats/*` — Analytics queries (search-analytics, etc.)

### 6.3 Embedding & AI (Server-side)
- [x] OpenAI text-embedding-3-small integration for vector generation
- [x] OpenAI gpt-4o-mini integration for chatbot responses
- [x] Prompt template rendering with provider context cards
- [x] Token usage tracking per request

---

## 7. AUTHENTICATION & AUTHORIZATION

- [x] Supabase Auth for all user authentication
- [x] Role-based access: site_admin, tenant_admin, user (from base template)
- [x] Site admins: full access to all linksy_* data
- [x] Provider staff (via linksy_provider_contacts): access to own org's data
- [x] Anonymous widget users: can search and create sessions (validated by host slug)
- [x] Google OAuth login
- [x] Microsoft (Azure AD) OAuth login
- [x] Middleware: route protection for /dashboard/* routes

---

## 8. DEPLOYMENT & DEVOPS

- [x] Vercel deployment configuration
- [x] Environment variables configured in Vercel
- [x] Supabase project linked
- [ ] Custom domain setup (pending — see Phase 0.7 in TASKS.md)
- [x] GitHub Actions CI/CD (type-check + lint + unit tests)
- [x] Database migrations version controlled in supabase/migrations/
- [x] Sentry error tracking (server + client + edge)
- [x] Vitest unit test framework (31 tests)
- [x] Playwright E2E test framework (smoke + referral workflow)

---

## 9. USER MIGRATION & ONBOARDING

- [ ] Auth migration plan for existing users (provider contacts with no passwords)
- [ ] Bulk invite / magic-link flow for migrated users
- [ ] Account claim verification (email + set password)
- [ ] Rollout communication plan
- [x] Provider self-service onboarding — 5-step public wizard at `/join/provider`
- [x] Host onboarding page at `/join/host`

---

## 10. DATA MIGRATION (Pre-Go-Live Sync)

- [ ] Incremental import to sync delta from legacy system
- [ ] Re-generate embeddings and LLM context cards for new/updated providers
- [ ] Final data QA pass before cutover

---

## 11. BILLING & FINANCIAL

- [ ] Stripe integration — Checkout, Customer Portal, webhook handlers
- [ ] Subscription tiers and pricing model
- [ ] Subscription status linked to host/tenant access
- [ ] QuickBooks integration (invoice/payment sync)

---

## 12. PUBLIC WEBSITE & DOMAIN

- [x] Public landing page at `/` with features, how-it-works, CTAs
- [ ] Full Impact Works marketing website (dedicated site or enhanced landing)
- [ ] Custom domain setup (DNS, Vercel, SSL)
- [ ] Email domain configuration (SPF/DKIM/DMARC, sender addresses)
- [ ] Email account provisioning (who gets @impactworks addresses)

---

## 13. AI SEARCH — EVENTS INTEGRATION

- [ ] Events included in AI search pipeline (vector search or supplemental results)
- [ ] Event data in LLM context cards (name, date, time, location, registration)
- [ ] Event result cards in widget UI
- [ ] Filter to future published events only

---

## 14. COMPLIANCE

- [ ] HIPAA risk assessment (audit PHI flows through system)
- [ ] BAAs with all sub-processors (Supabase, Vercel, OpenAI, Resend)
- [ ] Encryption audit (at rest + in transit)
- [ ] PHI access audit logging
- [ ] Data retention policies
- [ ] Compliance documentation

---

## 15. FUTURE FEATURES (Phase 3+)

- [ ] Multi-region support (beyond Clay County)
- [ ] United Way partnership integrations
- [ ] AIRS/211 taxonomy mapping
- [x] Provider self-service onboarding — 5-step public wizard at `/join/provider`; structured application storage; approval provisions full provider
- [ ] A/B testing for AI prompts
- [ ] Provider rating/feedback system
- [x] Event recurrence (iCal RRULE) — Daily/Weekly/Bi-weekly/Monthly/Annually
- [ ] SMS notifications
- [ ] Bulk provider import (CSV upload)
- [ ] AI-suggested provider-needs mappings
- [ ] Provider description auto-enhancement (AI rewrite)
- [ ] Widget analytics dashboard for paying customers
- [ ] Multi-language support
- [ ] Voice input (Whisper)
- [ ] Two-factor authentication (2FA)
- [ ] SSO integration (SAML)
