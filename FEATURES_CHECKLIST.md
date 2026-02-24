# Linksy Features & Requirements Checklist

> Complete inventory of all features discussed during planning sessions.
> Use this to audit current implementation state and generate remaining task lists.

---

## 1. DATABASE & INFRASTRUCTURE

### 1.1 Extensions & Core Setup
- [ ] pgvector extension enabled
- [ ] PostGIS extension enabled
- [ ] pg_trgm extension enabled
- [ ] Site record created for Linksy (Clay County)

### 1.2 Schema Tables (15 linksy_* tables)
- [ ] `linksy_need_categories` — 18 categories with slug, sort_order, airs_code placeholder
- [ ] `linksy_needs` — 85 needs with synonyms TEXT[], vector(1536) embedding column
- [ ] `linksy_providers` — with sector enum, referral_type, llm_context_card, ai_summary, embedding, search quality metrics
- [ ] `linksy_locations` — PostGIS GEOGRAPHY(POINT, 4326), geocode fields
- [ ] `linksy_provider_needs` — junction with source tracking (manual/referral_derived/ai_suggested) and is_confirmed
- [ ] `linksy_provider_contacts` — links auth.users to providers with contact_type enum and job_title
- [ ] `linksy_provider_notes` — timeline/activity log with note_type enum (general/outreach/update/internal)
- [ ] `linksy_tickets` — with ticket_number, status enum, client snapshot fields, source tracking
- [ ] `linksy_ticket_comments` — with is_private flag, author_role field
- [ ] `linksy_events` — with approval workflow status, PostGIS location, recurrence_rule, tags
- [ ] `linksy_search_sessions` — conversation tracking, token usage, crisis detection flags
- [ ] `linksy_crisis_keywords` — keyword, crisis_type, severity, response_template, emergency_resources JSONB
- [ ] `linksy_api_keys` — key_hash, allowed_domains, rate limiting, widget_config JSONB, subscription_status
- [ ] `linksy_ai_prompts` — versioned prompts with model_name, temperature, A/B testing support
- [ ] `linksy_interactions` — analytics: view/click/call/direction/website per session+provider

### 1.3 Enums (7)
- [ ] `linksy_sector` (nonprofit, faith_based, government, business)
- [ ] `linksy_project_status` (active, sustaining, maintenance, na)
- [ ] `linksy_referral_type` (standard, contact_directly)
- [ ] `linksy_ticket_status` (pending, customer_need_addressed, wrong_organization_referred, outside_of_scope, client_not_eligible, unable_to_assist, client_unresponsive)
- [ ] `linksy_contact_type` (customer, provider_employee)
- [ ] `linksy_event_status` (draft, pending_approval, published, cancelled)
- [ ] `linksy_note_type` (general, outreach, update, internal)

### 1.4 RPC Functions
- [ ] `linksy_search_needs()` — vector similarity search on needs embeddings
- [ ] `linksy_search_providers_nearby()` — PostGIS proximity + need filter, returns llm_context_cards
- [ ] `linksy_generate_context_card()` — builds markdown from provider+location+needs data
- [ ] `linksy_check_crisis()` — ILIKE keyword scan returning crisis_type, severity, resources

### 1.5 Triggers
- [ ] Auto `updated_at` on providers, locations, need_categories, needs, tickets, events
- [ ] Auto `llm_context_card` regeneration on provider field changes

### 1.6 Row Level Security
- [ ] Public read on: need_categories, needs, providers, locations, provider_needs, published events
- [ ] Admin-only write on all linksy_* tables (using users.role = 'site_admin')
- [ ] Provider staff can: read own contacts, read assigned tickets, manage own events, read/write own notes
- [ ] Anonymous insert on: search_sessions, interactions (widget usage)
- [ ] Private ticket comments visible only to site admins

### 1.7 Indexes
- [ ] GIN trigram indexes on provider name, needs name, crisis keywords
- [ ] IVFFlat indexes on needs embedding and providers embedding
- [ ] GIST indexes on locations geography and events geography
- [ ] B-tree indexes on all foreign keys, status columns, created_at

---

## 2. DATA MIGRATION (Power Apps → Supabase)

### 2.1 Import Scripts
- [ ] Site record creation (Clay County)
- [ ] Need categories import (18 from ic_needcategories.csv)
- [ ] Needs import (85 from ic_needs.csv, parse synonyms into TEXT[])
- [ ] Providers import (167 parent accounts from accounts.csv)
  - [ ] Enum mapping: ic_sector codes → linksy_sector values
  - [ ] Enum mapping: ic_projectstatus codes → linksy_project_status values
  - [ ] NON-REFERRAL accounts: strip text from name, set referral_type=contact_directly, preserve instructions
  - [ ] Child accounts (12): store as notes/services on parent, not separate providers
  - [ ] Slug generation from provider names
  - [ ] Social links aggregation into JSONB (facebook, instagram, linkedin, youtube)
- [ ] Locations import (from account address fields)
  - [ ] Parse address_line1, city, state, postal_code
  - [ ] Set is_primary=true for each provider's main location
- [ ] Provider-needs mapping (from referral history — which org served which need)
  - [ ] Source tagged as 'referral_derived'
- [ ] Tickets import (681 from ic_referrals.csv)
  - [ ] Enum mapping: ic_statusofreferral codes → linksy_ticket_status values
  - [ ] Client snapshot fields (name, email, phone)
  - [ ] Legacy referral number preservation
- [ ] Ticket comments extraction (from ic_customercomments and ic_providercomments fields)
- [ ] Legacy ID preservation in all tables for traceability

### 2.2 Post-Import Data Enhancement
- [ ] Geocode all provider addresses (Google Maps API — deferred)
- [ ] Generate embeddings for all 85 needs (name + synonyms → OpenAI text-embedding-3-small)
- [ ] Generate embeddings for all 167 providers (description → OpenAI text-embedding-3-small)
- [ ] Generate llm_context_cards for all providers (via linksy_generate_context_card function)
- [ ] Generate ai_summary for all providers (2-3 sentence LLM summary)
- [ ] Seed crisis keywords (suicide, domestic violence, trafficking, child abuse keywords + 988/hotline resources)
- [ ] Create initial AI prompt versions (search, crisis_detection, ticket_intake, context_card)

### 2.3 Manual Data (Needs Addressed panel — Eric's checklist)
- [ ] Import provider-needs from Dynamics 365 "Needs Addressed" panel for 72 zero-referral orgs
- [ ] Source tagged as 'manual', is_confirmed=true
- [ ] Merge with referral-derived mappings (dedup on provider_id + need_id)

---

## 3. ADMIN DASHBOARD

### 3.1 Layout & Navigation
- [ ] Authenticated dashboard layout with sidebar navigation
- [ ] Left nav sections: Providers, Contacts, Tickets, Events (under main); Needs Management (under Admin); Analytics, Settings (under System)
- [ ] Breadcrumb navigation
- [ ] User avatar + role display in header
- [ ] Mobile-responsive sidebar (collapsible)

### 3.2 Provider Management
- [ ] **List View**
  - [x] Searchable table with columns: name, sector, phone, referral_type, status, referral count
  - [x] Filter by: sector (nonprofit/faith_based/government/business), project_status, referral_type, is_active, **organization_type (all/parent/child/standalone)**
  - [x] Sort by: name, referral count, created date
  - [x] Bulk actions: activate, deactivate, export CSV
  - [x] "Add Provider" button
  - [x] Pagination
  - [x] **Child location badge** indicator for providers linked to a parent
- [x] **Detail View** (tabbed interface — mirrors Dynamics 365 layout)
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
    - [x] Add/remove contact links
  - [x] **Details Tab**
    - [ ] Social media links (Facebook, Instagram, LinkedIn, YouTube)
    - [ ] Project status dropdown
    - [ ] Referral type toggle (standard / contact_directly)
    - [ ] Referral instructions text field (shown when contact_directly)
    - [ ] Legacy ID display (read-only)
    - [ ] Search quality metrics display (popularity score, CTR, conversion rate)
  - [ ] **Tickets Tab**
    - [ ] Filtered ticket list for this provider
    - [ ] Status badges, client name, need, date
    - [ ] Click through to ticket detail
  - [ ] **Events Tab**
    - [ ] Events submitted by or associated with this provider
    - [ ] Status badges (draft/pending/published/cancelled)
    - [ ] Click through to event detail
  - [ ] **Notes/Timeline Tab** (from Dynamics 365 screenshot)
    - [ ] Chronological activity feed
    - [ ] Each note shows: author name, note_type badge, content, timestamp
    - [ ] "Add Note" form with type selector (general/outreach/update/internal)
    - [ ] Search/filter notes
  - [ ] Auto-save or explicit save button that triggers llm_context_card regeneration
  - [ ] "View LLM Context Card" preview (shows the generated markdown)

### 3.3 Needs Taxonomy Management
- [ ] **Category List View**
  - [ ] All 18 categories with need count per category
  - [ ] Drag-to-reorder (updates sort_order)
  - [ ] Add/edit/deactivate categories
  - [ ] AIRS code field (placeholder for future mapping)
- [ ] **Needs Under Category**
  - [ ] Expandable or drill-down list of needs per category
  - [ ] Each need shows: name, synonym count, provider count, is_active
  - [ ] Click to edit: name, description, synonyms
- [ ] **Synonym Management**
  - [ ] Tag-style input for adding/removing synonyms per need
  - [ ] "Regenerate Embedding" button (re-embeds after synonym changes)
  - [ ] Preview: shows what text will be embedded

### 3.4 Ticket Management
- [ ] **List View**
  - [ ] Searchable table: ticket_number, client_name, provider, need, status, date
  - [ ] Filter by: status, provider, need, date range, source
  - [ ] Status color-coded badges
  - [ ] Sort by: date, status, provider
  - [ ] Pagination
- [ ] **Detail View**
  - [ ] Client info section: name, email, phone
  - [ ] Assigned provider (with link to provider detail)
  - [ ] Assigned need
  - [ ] Description of need
  - [ ] Status dropdown (editable)
  - [ ] Client perception field
  - [ ] Follow-up sent toggle
  - [ ] Source badge (manual/chatbot/widget/phone)
  - [ ] If source=chatbot: link to search session
- [ ] **Comments Section**
  - [ ] Chronological comment thread
  - [ ] Each comment shows: author name, role badge, timestamp, content
  - [ ] "Add Comment" form with private toggle checkbox
  - [ ] Private comments visually distinguished (e.g., yellow background, lock icon)
  - [ ] Private comments only visible to site_admin users
- [ ] **Create Ticket Form**
  - [ ] Client info fields (name, email, phone)
  - [ ] Provider selector (searchable dropdown)
  - [ ] Need selector (searchable dropdown, grouped by category)
  - [ ] Description text area
  - [ ] Auto-generates ticket_number

### 3.5 Events Management
- [ ] **Approval Queue**
  - [ ] List of events with status=pending_approval
  - [ ] Quick approve/reject actions
  - [ ] Preview event details before approving
- [ ] **Calendar View**
  - [ ] Monthly/weekly calendar showing published events
  - [ ] Color-coded by need category
  - [ ] Click event to view/edit
- [ ] **List View**
  - [ ] All events with filters: status, provider, date range, category
  - [ ] Status badges
- [ ] **Create/Edit Event**
  - [ ] Title, description
  - [ ] Provider selector (optional — site-wide events have no provider)
  - [ ] Start date/time, end date/time, all-day toggle
  - [ ] Location name, address
  - [ ] Need category selector
  - [ ] Tags (multi-select or free-form)
  - [ ] Contact info (name, email, phone)
  - [ ] Registration URL
  - [ ] Status workflow: draft → pending_approval → published / cancelled
  - [ ] Recurrence rule (future: iCal RRULE support)

### 3.6 Analytics Dashboard
- [ ] **Search Analytics**
  - [ ] Total searches over time (line chart)
  - [ ] Searches by need category (bar chart)
  - [ ] Top searched terms
  - [ ] Average messages per session
  - [ ] Token usage over time
- [ ] **Provider Analytics**
  - [ ] Most viewed providers
  - [ ] Click-through rates per provider
  - [ ] Ticket conversion rates
  - [ ] Search-to-referral funnel
- [ ] **Crisis Alerts**
  - [ ] Crisis detection count over time
  - [ ] Crisis type breakdown (pie chart)
  - [ ] Recent crisis sessions (table with timestamp, type, message snippet)
- [ ] **Widget Analytics**
  - [ ] Usage per API key
  - [ ] Queries this month vs limit
  - [ ] Active widgets count
  - [ ] Geographic distribution of searches
- [ ] **Ticket Analytics**
  - [ ] Tickets by status (stacked bar)
  - [ ] Resolution rate over time
  - [ ] Average time to resolution
  - [ ] Top providers by ticket volume

### 3.7 Settings
- [ ] **API Key Management**
  - [ ] List of API keys with: name, prefix, status, last_used, queries_this_month
  - [ ] Create new key: name, allowed_domains, rate_limit_per_hour, monthly_query_limit
  - [ ] Revoke key (soft delete — is_active=false)
  - [ ] Widget config per key: welcome_message, primary_color, logo_url, bot_name
  - [ ] Copy embed snippet (JS code for customer to paste on their site)
- [ ] **Crisis Keyword Management**
  - [ ] List of keywords with: keyword, crisis_type, severity, is_active
  - [ ] Add/edit/deactivate keywords
  - [ ] Response template editor per keyword
  - [ ] Emergency resources editor (phone, name, URL)
  - [ ] Test: input a message and see if crisis is detected
- [ ] **AI Prompt Management**
  - [ ] List of prompt types: search, crisis_detection, ticket_intake, context_card
  - [ ] Version history per prompt type
  - [ ] Edit prompt text, model, temperature, max_tokens
  - [ ] Activate/deactivate versions
  - [ ] Performance score tracking (future)
  - [ ] Test: input a query and see prompt output
- [ ] **Widget Customization**
  - [ ] Default widget appearance settings
  - [ ] Preview widget with current settings
  - [ ] Welcome message editor
  - [ ] Color theme picker
  - [ ] Logo upload

---

## 4. PROVIDER PORTAL (Phase 2)

- [ ] Provider staff login (via linksy_provider_contacts → auth.users)
- [ ] View own organization profile
- [ ] Edit limited fields (hours, contact info, description — if allowed)
- [ ] View tickets assigned to their organization
- [ ] Update ticket status, add comments (non-private only)
- [ ] Submit events for approval
- [ ] View own provider analytics (views, clicks, referrals)
- [ ] Notification when new ticket is assigned

---

## 5. PUBLIC WIDGET / CHATBOT

### 5.1 Embed Infrastructure
- [ ] JavaScript embed snippet: `<script src="https://linksy.app/widget.js" data-api-key="lk_..."></script>`
- [ ] Widget loads in iframe or shadow DOM (style isolation)
- [ ] API key validation on load (check is_active, allowed_domains, rate limits)
- [ ] CORS configuration per API key's allowed_domains

### 5.2 Widget UI
- [ ] Collapsible chat bubble (bottom-right corner, customizable position)
- [ ] Chat interface with message bubbles (user + bot)
- [ ] Configurable welcome message
- [ ] Configurable colors, logo, bot name (from widget_config JSONB)
- [ ] Loading states (typing indicator while AI responds)
- [ ] Mobile responsive
- [ ] Accessibility: keyboard navigation, screen reader support, ARIA labels

### 5.3 Conversation Flow
- [ ] User types natural language query
- [ ] Optional location prompt: "What's your zip code?" or browser geolocation
- [ ] AI processes query through hybrid search pipeline:
  1. Crisis check (before anything else)
  2. Embed query → pgvector search on needs
  3. Match needs → providers via provider_needs
  4. PostGIS proximity filter (if location provided)
  5. Return top 3-5 provider context cards to LLM
  6. LLM generates natural response
- [ ] Provider result cards displayed inline:
  - [ ] Organization name
  - [ ] Phone number (click-to-call on mobile)
  - [ ] Address (click for directions)
  - [ ] Hours of operation
  - [ ] Website link
  - [ ] Distance from user (if location provided)
  - [ ] Services/needs tags
  - [ ] "Contact Directly" badge for contact_directly providers
- [ ] Follow-up questions supported (multi-turn conversation)
- [ ] "Create a referral" option (generates a ticket)
- [ ] Session ends after inactivity or user closes widget

### 5.4 Crisis Detection
- [ ] Runs on EVERY user message before search
- [ ] Uses linksy_check_crisis() function
- [ ] On detection: immediately show emergency banner
  - [ ] Banner: red/urgent styling, non-dismissable for 5 seconds
  - [ ] Shows: crisis resource name, phone number (click-to-call), URL
  - [ ] Example: "If you or someone you know is in crisis, call 988 (Suicide & Crisis Lifeline)"
- [ ] Logs crisis_detected=true and crisis_type on search session
- [ ] Normal search continues after crisis resources shown
- [ ] Crisis types: suicide, domestic_violence, trafficking, child_abuse

### 5.5 Session Tracking & Analytics
- [ ] Create linksy_search_sessions record on first message
- [ ] Track: initial_query, zip_code, conversation_history, inferred_needs
- [ ] Count: total_tokens_used, message_count
- [ ] Track interactions: which providers viewed, clicked, called, directions, website
- [ ] Track: whether session resulted in a ticket creation
- [ ] Anonymous: user_fingerprint for session continuity, no PII stored

### 5.6 Rate Limiting
- [ ] Per-API-key rate limiting (rate_limit_per_hour)
- [ ] Monthly query cap (monthly_query_limit, queries_this_month)
- [ ] Graceful degradation: show message when limit reached
- [ ] Usage counter increment on each query

---

## 6. API ENDPOINTS

### 6.1 Widget API (Public — authenticated via API key)
- [ ] `POST /api/widget/chat` — Send message, get AI response
- [ ] `POST /api/widget/session` — Create new search session
- [ ] `POST /api/widget/interaction` — Track view/click/call events
- [ ] `POST /api/widget/ticket` — Create ticket from widget
- [ ] `GET /api/widget/config` — Get widget configuration for API key

### 6.2 Admin API (Authenticated — requires site_admin role)
- [ ] CRUD endpoints for: providers, needs, categories, tickets, events, notes
- [ ] `POST /api/admin/embeddings/generate` — Trigger embedding regeneration
- [ ] `POST /api/admin/context-cards/regenerate` — Bulk regenerate LLM context cards
- [ ] `GET /api/admin/analytics/*` — Various analytics queries

### 6.3 Embedding & AI (Server-side)
- [ ] OpenAI text-embedding-3-small integration for vector generation
- [ ] OpenAI gpt-4o integration for chatbot responses
- [ ] Prompt template rendering with provider context cards
- [ ] Token usage tracking per request

---

## 7. AUTHENTICATION & AUTHORIZATION

- [ ] Supabase Auth for all user authentication
- [ ] Role-based access: site_admin, tenant_admin, user (from base template)
- [ ] Site admins: full access to all linksy_* data
- [ ] Provider staff (via linksy_provider_contacts): access to own org's data
- [ ] Anonymous widget users: can search and create sessions (validated by API key)
- [ ] API key authentication for widget endpoints (key_hash validation)
- [ ] Middleware: route protection for /dashboard/* routes

---

## 8. DEPLOYMENT & DEVOPS

- [ ] Vercel deployment configuration
- [ ] Environment variables configured in Vercel
- [ ] Supabase project linked
- [ ] Custom domain setup (future)
- [ ] GitHub Actions CI/CD (exists from template)
- [ ] Database migrations version controlled in supabase/migrations/

---

## 9. FUTURE FEATURES (Phase 2-3)

- [ ] Stripe billing integration (automated subscriptions)
- [ ] Multi-region support (beyond Clay County)
- [ ] United Way partnership integrations
- [ ] AIRS/211 taxonomy mapping
- [x] Provider self-service onboarding — 5-step public wizard at `/join/provider`; structured application storage; approval provisions full provider
- [ ] A/B testing for AI prompts
- [ ] Provider rating/feedback system
- [ ] Advanced event recurrence (iCal RRULE)
- [ ] Email notifications (new ticket, status changes)
- [ ] SMS notifications
- [ ] Bulk provider import (CSV upload)
- [ ] AI-suggested provider-needs mappings
- [ ] Provider description auto-enhancement (AI rewrite)
- [ ] Widget analytics dashboard for paying customers
- [ ] Multi-language support
