# Linksy Technical Specification

## Overview

Linksy is an AI-powered nonprofit service directory platform that enables organizations to embed intelligent chatbots on their websites for connecting people with community services. Built as a module on top of the MultitenantOS foundation (Next.js 14, TypeScript, Supabase, Tailwind CSS + shadcn/ui).

## Business Model

- **Pure B2B widget service**: Organizations pay to embed a search widget/chatbot on their own websites
- **Revenue model**: Subscription per organization (manual billing for MVP, Stripe Phase 2)
- **First customer**: Impact Clay (Clay County, FL)
- **Competitive advantage over 211.org**: Real-time provider updates, AI conversational search, collaborative case management

## Architecture

### Five-Tier Hierarchy

```
Site (Linksy platform)
  → Region (Clay County, future: Duval County, etc.)
    → Organization/Tenant (Impact Clay = first paying customer)
      → Location (physical addresses)
        → Users (staff, admins)
```

### Data Isolation Model (Hybrid)

- **PUBLIC**: Provider directory, needs taxonomy, events → searchable by anyone via widget
- **PRIVATE per tenant**: Tickets, analytics, user interactions, billing → isolated per organization
- **SHARED admin**: Crisis keywords, AI prompts, provider notes → site-admin managed

### Supabase Project

- **Project ID**: `vjusthretnfmxmgdiwtw`
- **URL**: `https://vjusthretnfmxmgdiwtw.supabase.co`
- **Region**: us-west-2
- **Extensions**: pgvector, PostGIS, pg_trgm

## Database Schema

### Linksy Tables (15 total)

| Table | Purpose | Public? |
|-------|---------|---------|
| `linksy_need_categories` | Top-level taxonomy (18 categories) | ✅ Read |
| `linksy_needs` | Specific services with synonyms + embeddings (85) | ✅ Read |
| `linksy_providers` | Organizations offering services (167 parent orgs) | ✅ Read |
| `linksy_locations` | Physical addresses with PostGIS coordinates | ✅ Read |
| `linksy_provider_needs` | Many-to-many: which org provides which service | ✅ Read |
| `linksy_provider_contacts` | Links auth users to provider orgs | ❌ |
| `linksy_provider_notes` | Staff activity timeline (outreach, updates) | ❌ |
| `linksy_tickets` | Service referrals/requests (681 migrated) | ❌ |
| `linksy_ticket_comments` | Shared & private comments on tickets | ❌ |
| `linksy_events` | Org-submitted events with approval workflow | ✅ Published |
| `linksy_search_sessions` | AI chatbot conversation tracking | ❌ |
| `linksy_crisis_keywords` | Crisis detection keyword database | ❌ |
| `linksy_api_keys` | Widget authentication & rate limiting | ❌ |
| `linksy_ai_prompts` | Versioned prompt management | ❌ |
| `linksy_interactions` | Analytics: service views/clicks | ❌ |

### Key Enums

- `linksy_sector`: nonprofit, faith_based, government, business
- `linksy_project_status`: active, sustaining, maintenance, na
- `linksy_referral_type`: standard, contact_directly
- `linksy_ticket_status`: pending, customer_need_addressed, wrong_organization_referred, outside_of_scope, client_not_eligible, unable_to_assist, client_unresponsive
- `linksy_event_status`: draft, pending_approval, published, cancelled
- `linksy_note_type`: general, outreach, update, internal

### RPC Functions

- `linksy_search_needs(query_embedding, threshold, count, site_id)` — Vector similarity search on needs
- `linksy_search_providers_nearby(lat, lng, radius_miles, need_id, site_id, limit)` — PostGIS proximity + need filter, returns `llm_context_card` markdown
- `linksy_generate_context_card(provider_id)` — Builds markdown context card from provider data
- `linksy_check_crisis(message, site_id)` — Scans message for crisis keywords

### Triggers

- Auto `updated_at` on: providers, locations, need_categories, needs, tickets, events
- Auto `llm_context_card` regeneration on provider changes (name, description, phone, email, website, hours, referral_type, referral_instructions)

## AI Architecture (Hybrid Approach)

### Zero-Token-Cost Filtering

1. **pgvector** — Semantic search on needs/provider embeddings (no LLM call)
2. **PostGIS** — Geographic proximity filtering (no LLM call)
3. **SQL** — Status, eligibility, sector filtering (no LLM call)

### Token-Efficient LLM Context

4. **llm_context_card** — Pre-rendered markdown on each provider (~80 tokens each)
5. Final 3-5 results passed to LLM as context cards (~400 tokens total)
6. LLM generates natural conversational response

### Embedding Strategy

- Model: `text-embedding-3-small` (OpenAI, 1536 dimensions)
- Needs: Embed `name + synonyms` concatenated
- Providers: Embed `description` field
- Regenerate on content changes

### Chatbot Flow

```
User types query
  → Embed query with OpenAI
  → pgvector finds top semantic matches in linksy_needs
  → Match needs to providers via linksy_provider_needs
  → PostGIS filters by user proximity
  → SQL filters by is_active, referral_type
  → Return top 3-5 llm_context_cards to LLM
  → LLM generates conversational response with provider details
  → Track in linksy_search_sessions + linksy_interactions
```

### Crisis Detection

- Runs BEFORE search on every user message
- Uses `linksy_check_crisis()` function (ILIKE keyword matching)
- On match: immediately show emergency resources, pause normal search
- Crisis types: suicide, domestic_violence, trafficking, child_abuse
- Resources stored per-keyword in JSONB (phone numbers, names, URLs)

## UI Requirements

### Admin Dashboard (Site Admin — your team)

#### Provider Management
- **List view**: All 167 providers with search, filter by sector/status/referral_type
- **Detail view** (mirrors Dynamics 365 layout):
  - Summary tab: Name, sector, contact info, website, hours, description
  - Contacts tab: Linked staff users
  - Details tab: Social links, project status, referral settings
  - Referrals/Tickets tab: All tickets for this provider
  - Events tab: Events submitted by this provider
  - Notes/Timeline tab: Staff activity log (from screenshot — Heather Johnston's outreach notes)
  - Needs Addressed panel: Which services this org provides (linksy_provider_needs)
- **Edit capabilities**: All fields editable, auto-regenerates llm_context_card on save
- **Bulk actions**: Activate/deactivate, export

#### Needs Taxonomy Management
- **Category list**: 18 categories, drag-to-reorder (sort_order)
- **Needs under each category**: Add/edit/deactivate needs
- **Synonym management**: Edit synonyms array per need (feeds embeddings)
- **Future**: AIRS code mapping field

#### Ticket Management
- **List view**: All tickets with filters (status, provider, date range)
- **Detail view**: Client info, description, status, assigned provider/need
- **Comments**: Shared comments (visible to provider) and private comments (admin only)
- **Status workflow**: Pending → various outcomes
- **Satisfaction tracking**: Client perception field

#### Events Management
- **Approval queue**: Events submitted by providers in pending_approval status
- **Calendar view**: Published events
- **Create/edit**: Site admins can create site-wide events (no provider_id)

#### Analytics Dashboard
- Search session volume over time
- Top searched needs
- Crisis detection alerts
- Provider click-through rates
- Ticket conversion rates
- Widget usage per API key

#### Settings
- API key management (create, revoke, configure domains)
- Crisis keyword management
- AI prompt versioning
- Widget configuration (colors, welcome message, branding)

### Provider Portal (Provider Staff — future phase)

- View their own organization's profile
- See tickets assigned to them
- Update ticket status and add comments
- Submit events for approval
- View their own analytics

### Public Widget / Chatbot (Embedded on customer websites)

- **Embed method**: JavaScript snippet with API key
- **UI**: Chat interface, collapsible widget
- **Conversation flow**:
  1. Welcome message (configurable per API key)
  2. User describes their need in natural language
  3. Optional: Ask for zip code / location
  4. AI searches and returns relevant providers
  5. Provider cards with: name, phone, address, hours, website link, distance
  6. User can click for directions, call, or visit website
  7. Option to create a ticket/referral
- **Crisis mode**: If crisis detected, immediately show emergency banner with resources
- **Branding**: Customizable colors/logo per widget deployment via widget_config JSONB
- **Analytics**: Track every interaction (view, click, call, direction, website)
- **Rate limiting**: Per API key, configurable per-hour and monthly limits

## Provider Data Details

### NON-REFERRAL Organizations (31 accounts)
- `referral_type = 'contact_directly'`
- Name has been cleaned (NON-REFERRAL text stripped)
- Original instructions preserved in `referral_instructions` field
- Widget should show "Contact this organization directly" with instructions

### Child Accounts (12 accounts → services under parents)
- River Christian Church → Grief Share, Food & Friends, Financial Peace University, Divorce Care, Celebrate Recovery
- Saved 2 Serve → Love Moves
- Orange Park United Methodist Church → Food Pantry of Orange Park
- Good Samaritan Anglican Church → Good Samaritan Ministry
- Clay County Clerk Of Courts → Low Bono Program
- NE FL Healthy Start Coalition → Fatherhood PRIDE
- Impact Clay → Impact Clay Train, Recovering Clay

These are stored as provider notes or services, NOT separate providers.

### Data Quality
- 162/167 providers have descriptions (avg 490 chars — great for embeddings)
- 96% have phone numbers
- 85% have websites
- 80% have addresses (geocoding pending — Google Maps API needed)
- 65% have social media links
- 56% have hours of operation

## Needs Taxonomy (18 Categories, 85 Needs)

Categories include: Child & Adolescent Mental Health, Food and Daily Needs, Human Trafficking, Special Situations, Pets and Animals, Legal Help, Learning and Education, Mind and Wellness, Money Help, Home and Shelter, Disability Services, Veterans Services, Vehicle Assistance, Healthcare, Transportation, Family & Child Services, Employment & Financial Stability, Community Support.

Each need has synonym lists (e.g., "Rental Assistance" → ['Rental Help', 'Help Paying Rent', 'Rent Money', ...]) that are used as embedding seed data.

## Provider-to-Need Mapping Sources

Three sources, merged with deduplication:
1. **Referral history** (from ic_referrals.csv) — 84 orgs have at least one referral
2. **Needs Addressed panel** (manually extracted from Dynamics 365) — direct assignments, includes needs never in referrals
3. **AI suggestion** (future) — analyze provider descriptions to suggest likely services

`linksy_provider_needs.source` tracks origin: 'manual', 'referral_derived', 'ai_suggested'
`linksy_provider_needs.is_confirmed` tracks staff verification

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL 17)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **AI/LLM**: OpenAI (gpt-4o for chat, text-embedding-3-small for vectors)
- **Geospatial**: PostGIS
- **Vector Search**: pgvector
- **Deployment**: Vercel

## File Structure Convention

```
app/
  (auth)/                    # Auth pages (login, signup, etc.)
  (dashboard)/               # Authenticated admin area
    dashboard/               # Main dashboard
    providers/               # Provider CRUD
    providers/[id]/          # Provider detail with tabs
    needs/                   # Taxonomy management
    tickets/                 # Ticket management
    events/                  # Event management + approval
    analytics/               # Dashboard analytics
    settings/                # API keys, crisis keywords, prompts, widget config
  api/
    widget/                  # Public widget API endpoints
    embeddings/              # Embedding generation endpoints
components/
  ui/                        # shadcn/ui primitives
  providers/                 # Provider-specific components
  tickets/                   # Ticket-specific components
  events/                    # Event-specific components
  widget/                    # Embeddable widget components
  analytics/                 # Charts and dashboards
lib/
  supabase/                  # Supabase client helpers
  utils/                     # Shared utilities
  types/                     # TypeScript types
  hooks/                     # Custom React hooks
data/
  migration/                 # CSV source files (gitignored)
scripts/
  import/                    # Data import scripts
  embeddings/                # Embedding generation scripts
supabase/
  migrations/                # SQL migration files
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://vjusthretnfmxmgdiwtw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
OPENAI_API_KEY=<for embeddings and chatbot>
GOOGLE_MAPS_API_KEY=<for geocoding - add later>
NEXT_PUBLIC_APP_URL=<app url>
NEXT_PUBLIC_APP_NAME=Linksy
```

## Implementation Phases

### Phase 1 — MVP (Current)
- [x] Database schema deployed
- [x] Data imported from Power Apps
- [ ] Admin dashboard: Provider list/detail CRUD
- [ ] Admin dashboard: Needs taxonomy management
- [ ] Admin dashboard: Ticket list/detail with comments
- [ ] Embeddable widget with AI chatbot
- [ ] Crisis detection in chatbot
- [ ] Embedding generation for all providers/needs
- [ ] Basic analytics dashboard

### Phase 2 — Expansion
- [ ] Provider self-service portal
- [ ] Event submission + approval workflow
- [ ] Geocoding all addresses (Google Maps API)
- [ ] Stripe billing integration
- [ ] Multi-region support
- [ ] Advanced analytics

### Phase 3 — Scale
- [ ] United Way partnership integrations
- [ ] AIRS taxonomy mapping
- [ ] Multi-county/state deployments
- [ ] A/B testing for AI prompts
- [ ] Provider rating/feedback system
