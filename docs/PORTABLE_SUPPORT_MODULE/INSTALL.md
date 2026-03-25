# Support Ticket Module — Installation Guide for Claude Code

> **How to use:** Open Claude Code on your target project and paste this file as context, or reference it with `@docs/PORTABLE_SUPPORT_MODULE/INSTALL.md`. Claude Code will walk through each phase interactively.

---

## Pre-Flight: Ask the Human These Questions First

Before writing any code, ask the user these questions and store the answers as variables you'll reference throughout:

```
1. What is your project's tech stack? (Confirm: Next.js 14+, Supabase, TypeScript)
2. What is your Supabase project ID? (For running migrations)
3. What component library do you use? (shadcn/ui, Radix, MUI, custom?)
4. What CSS approach? (Tailwind, CSS Modules, styled-components?)
5. Do you use React Query / TanStack Query for data fetching? (Version?)
6. What is your data fetching pattern? (React Query hooks wrapping fetch? SWR? Server components?)
7. Where are your shared types defined? (e.g., lib/types/, types/, etc.)
8. Where are your API routes? (e.g., app/api/)
9. Where are your reusable components? (e.g., components/)
10. Where are your hooks? (e.g., lib/hooks/, hooks/)
11. Where is your Supabase client configured? (e.g., lib/supabase/server.ts)
    - Do you have both an RLS-respecting client AND a service-role client?
12. Do you have an email sending utility? (Resend, SendGrid, SMTP, etc.)
13. Do you have an existing auth middleware? (e.g., requireAuth(), getUser())
14. What is your GitHub repo (owner/repo) for the AI remediation PR feature?
15. What roles does your app have? (e.g., admin, user, etc.) — map to: site_admin, tenant_admin, provider_contact
16. Do you want the full system (referral tickets + support tickets + AI) or just parts?
17. What table prefix do you want? (Default: support_ — Linksy used linksy_)
```

Store these answers. Every file you create must conform to the user's stack, not Linksy's.

---

## Phase 1: Database Schema

### Step 1.1: Run the Schema Migration

The complete schema is in `SCHEMA.sql` in this same directory. It creates:

| Table | Purpose |
|-------|---------|
| `{prefix}tickets` | Main ticket table (referrals or support requests) |
| `{prefix}ticket_comments` | Comments on tickets (public/private) |
| `{prefix}ticket_events` | Immutable audit trail for all lifecycle changes |
| `{prefix}support_tickets` | Internal support tickets (user → staff) |
| `{prefix}support_ticket_comments` | Comments on support tickets |
| `{prefix}ticket_status_reasons` | Admin-configurable sub-status reasons |
| `{prefix}referral_alert_config` | SLA and alert configuration |

Plus: enums, sequences, functions, triggers, RLS policies, and indexes.

**Instructions for Claude Code:**
1. Read `SCHEMA.sql` from this directory
2. Replace the `linksy_` prefix with the user's chosen prefix throughout
3. Adapt foreign key references to match the user's existing tables:
   - `linksy_providers` → user's organization/provider table
   - `linksy_needs` → user's service/category table (or remove if N/A)
   - `linksy_need_categories` → user's category parent table (or remove)
   - `tenants` → user's tenant/org table (or remove for single-tenant)
   - `users` → user's users table
   - `auth.users` → Supabase auth users
   - `sites` → user's site table (or remove)
4. Run via Supabase MCP `execute_sql` or paste in the SQL Editor
5. Verify tables exist after running

### Step 1.2: Add AI Columns to Support Tickets

These columns power the AI triage + remediation system:

```sql
-- AI Triage
ALTER TABLE {prefix}support_tickets
  ADD COLUMN IF NOT EXISTS ai_triage JSONB,
  ADD COLUMN IF NOT EXISTS ai_triage_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ai_triage_status IN ('pending', 'analyzing', 'complete', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_triage_status
  ON {prefix}support_tickets (ai_triage_status)
  WHERE ai_triage_status IN ('pending', 'analyzing');

-- AI Remediation
ALTER TABLE {prefix}support_tickets
  ADD COLUMN IF NOT EXISTS remediation_status TEXT NOT NULL DEFAULT 'none'
    CHECK (remediation_status IN ('none', 'approved', 'generating', 'pr_created', 'merged', 'failed')),
  ADD COLUMN IF NOT EXISTS remediation_pr_url TEXT,
  ADD COLUMN IF NOT EXISTS remediation_branch TEXT,
  ADD COLUMN IF NOT EXISTS remediation_result JSONB,
  ADD COLUMN IF NOT EXISTS remediation_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS remediation_approved_at TIMESTAMPTZ;
```

---

## Phase 2: TypeScript Types

Create a types file at the user's types directory. Adapt to their naming conventions.

```typescript
// Types for the Support Ticket Module

// === Enums ===

export type TicketStatus =
  | 'pending'
  | 'in_process'
  | 'customer_need_addressed'
  | 'wrong_organization_referred'
  | 'outside_of_scope'
  | 'client_not_eligible'
  | 'unable_to_assist'
  | 'client_unresponsive'
  | 'transferred_another_provider'
  | 'transferred_pending'

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type SupportTicketCategory = 'technical' | 'account' | 'billing' | 'feature_request' | 'other'
export type TriageStatus = 'pending' | 'analyzing' | 'complete' | 'failed' | 'skipped'
export type RemediationStatus = 'none' | 'approved' | 'generating' | 'pr_created' | 'merged' | 'failed'
export type TicketEventType = 'created' | 'assigned' | 'reassigned' | 'forwarded' | 'status_changed' | 'comment_added' | 'updated'
export type ReassignmentReason = 'unable_to_assist' | 'wrong_org' | 'capacity' | 'other' | 'admin_reassignment' | 'internal_assignment'
export type ActorType = 'site_admin' | 'provider_admin' | 'provider_contact' | 'system'

// === Interfaces ===

export interface Ticket {
  id: string
  site_id: string
  ticket_number: string
  provider_id: string | null
  need_id: string | null
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  description_of_need: string | null
  status: TicketStatus
  status_reason_id: string | null
  status_reason?: TicketStatusReason
  is_test: boolean
  duplicate_flag_type: 'case_a' | 'case_b' | 'case_c' | 'case_d' | null
  source: string | null
  sla_due_at: string | null
  sla_reminder_sent_at: string | null
  custom_data?: Record<string, unknown>
  assigned_to: string | null
  assigned_at: string | null
  reassignment_count: number
  last_reassigned_at: string | null
  forwarded_from_provider_id: string | null
  created_at: string
  updated_at: string
  // Relations (optional, populated by joins)
  need?: { id: string; name: string }
  provider?: { id: string; name: string; phone?: string }
  comments?: TicketComment[]
}

export interface TicketComment {
  id: string
  ticket_id: string
  author_id: string | null
  author_name: string | null
  author_role: string | null
  content: string
  is_private: boolean
  created_at: string
}

export interface TicketEvent {
  id: string
  ticket_id: string
  event_type: TicketEventType
  actor_id: string | null
  actor_type: ActorType | null
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  reason: ReassignmentReason | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  actor?: { full_name: string; email: string }
}

export interface TicketStatusReason {
  id: string
  tenant_id: string
  parent_status: string
  label: string
  sort_order: number
  is_active: boolean
}

export interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  category: SupportTicketCategory | null
  submitter_id: string | null
  submitter_name: string | null
  submitter_email: string | null
  provider_id: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  ai_triage: TriageResult | null
  ai_triage_status: TriageStatus
  remediation_status: RemediationStatus
  remediation_pr_url: string | null
  remediation_branch: string | null
  remediation_result: RemediationResult | null
  remediation_approved_at: string | null
  comments?: SupportTicketComment[]
}

export interface SupportTicketComment {
  id: string
  ticket_id: string
  author_id: string | null
  author_name: string | null
  content: string
  is_internal: boolean
  created_at: string
}

export interface TriageResult {
  classification: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  affected_areas: string[]
  root_cause_hypothesis: string
  suggested_fix: string
  remediation_prompt: string
  investigation_steps: string[]
  confidence: number
  estimated_complexity: 'trivial' | 'small' | 'medium' | 'large'
}

export interface RemediationResult {
  files_changed: Array<{ path: string; summary: string }>
  commit_message: string
  summary: string
  model_used: string
  pr_url?: string
  branch?: string
  error?: string
}

export interface DuplicateCheckResult {
  blocked: boolean
  flagType: 'case_a' | 'case_b' | 'case_c' | 'case_d' | null
  message: string | null
  relatedTickets: Array<{ id: string; ticket_number: string; created_at: string }>
}
```

---

## Phase 3: Utility Functions

Create these utility files. **Adapt imports/patterns to match the user's project.**

### 3.1: AI Triage (`lib/utils/ai-triage.ts` or equivalent)

**What it does:** Takes a support ticket, sends it to GPT-4o-mini with a system prompt describing YOUR project's architecture, returns a structured triage analysis.

**Key customization points:**
- `SYSTEM_ARCHITECTURE` constant: **MUST be rewritten** for each target project. Describe the project's stack, directory structure, database tables, auth model, and common issue patterns. This is what makes the AI triage accurate.
- Model: `gpt-4o-mini` (fast + cheap for classification)
- Email notification: sends HTML triage report to `ADMIN_EMAIL`

**Source reference:** See `ai-triage.ts` in the Linksy codebase for the complete implementation (276 lines). The core flow is:
1. Mark ticket as `analyzing`
2. Call OpenAI with structured JSON response format
3. Save triage result to DB
4. Fire-and-forget email to admin

### 3.2: AI Remediation (`lib/utils/ai-remediate.ts` or equivalent)

**What it does:** Takes a triaged support ticket, reads affected files from GitHub, sends to GPT-4o to generate a fix, creates a branch + commit + PR.

**Key customization points:**
- `PROJECT_CONVENTIONS` constant: **MUST be rewritten** for each target project. Include framework, file naming conventions, styling approach, directory structure, coding patterns.
- Model: `gpt-4o` (needs the power for code generation)
- GitHub integration via Octokit

**Dependencies:**
- `openai` npm package
- `@octokit/rest` npm package

**Environment variables needed:**
```
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your-github-org
GITHUB_REPO=your-repo-name
GITHUB_BASE_BRANCH=main
```

**Source reference:** See `ai-remediate.ts` in the Linksy codebase (493 lines). The core flow is:
1. Mark ticket as `generating`
2. Read affected files from GitHub (with path fallback for common mistakes)
3. Send to OpenAI with project conventions + file contents + triage analysis
4. Parse JSON response: `{ changes[], commit_message, summary }`
5. Create GitHub branch → tree → commit → PR
6. Update ticket with PR URL
7. Fire-and-forget email to admin

### 3.3: Duplicate Detection (`lib/utils/duplicate-detection.ts` or equivalent)

**What it does:** Checks if a new ticket/referral is a duplicate based on 4 rules:
- **Case B (BLOCKS):** Same client + same provider + same service + within 30 days
- **Case A (FLAGS):** Same client + 5+ providers + same service + same day
- **Case C (FLAGS):** Same client + same provider on consecutive days
- **Case D (FLAGS):** Same client + same service category + same week

**Customization:** Remove cases that don't apply to your domain. Case B (blocking) is the most important.

**Source reference:** See `duplicate-detection.ts` in the Linksy codebase (176 lines).

### 3.4: Email Service

Adapt to the user's existing email infrastructure. The ticket system sends emails for:
- New ticket created → notify assigned handler
- Ticket status changed → notify client
- Ticket forwarded → notify admin or new provider
- Ticket assigned → notify assignee
- AI triage complete → notify admin with analysis
- AI remediation PR created → notify admin with PR link

---

## Phase 4: API Routes

Create these API routes. Adapt auth middleware, response patterns, and error handling to match the user's existing patterns.

### 4.1: Referral/Ticket Routes

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/tickets` | List tickets with filters (status, provider, date range, search) | Required |
| `POST` | `/api/tickets` | Create ticket (admin) with duplicate detection | Admin |
| `GET` | `/api/tickets/[id]` | Get ticket detail with relations | Required |
| `PATCH` | `/api/tickets/[id]` | Update ticket (status, assignment, details) | Required |
| `GET` | `/api/tickets/[id]/comments` | List comments (filter private for non-admins) | Required |
| `POST` | `/api/tickets/[id]/comments` | Add comment | Required |
| `GET` | `/api/tickets/[id]/events` | Get audit trail | Required |
| `POST` | `/api/tickets/[id]/assign` | Internal assignment (same org) | Required |
| `POST` | `/api/tickets/[id]/forward` | Forward to admin pool or another provider | Required |
| `POST` | `/api/admin/tickets/[id]/reassign` | Admin reassignment to any provider | Admin |
| `PATCH` | `/api/tickets/bulk` | Bulk status update | Admin |

### 4.2: Public Ticket Creation (if needed)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `POST` | `/api/public/tickets` | Public ticket submission (rate limited) | None |

Key features: test detection, rate limiting, referral cap (max 4 active per client), duplicate detection, webhook events.

### 4.3: Support Ticket Routes

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/support-tickets` | List support tickets | Required |
| `POST` | `/api/support-tickets` | Create support ticket (auto-triggers AI triage) | Required |
| `GET` | `/api/support-tickets/[id]` | Get detail with comments | Required |
| `PATCH` | `/api/support-tickets/[id]` | Update status/priority/assignment | Required |
| `POST` | `/api/support-tickets/[id]/comments` | Add comment | Required |
| `POST` | `/api/support-tickets/[id]/triage` | Trigger/re-trigger AI triage | Admin |
| `POST` | `/api/support-tickets/[id]/remediate` | Approve AI remediation → creates GitHub PR | Admin |

### 4.4: Status Reasons

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/ticket-status-reasons?parent_status=X` | Get reasons for a status | Required |
| `POST` | `/api/ticket-status-reasons` | Create new reason | Admin |
| `PATCH` | `/api/ticket-status-reasons/[id]` | Update reason | Admin |

---

## Phase 5: React Query Hooks

Create data-fetching hooks that match the user's patterns. Key hooks needed:

### 5.1: Ticket Hooks

```typescript
// Query hooks
useTickets(filters) → GET /api/tickets (staleTime: 2min)
useTicket(id) → GET /api/tickets/[id] (staleTime: 2min)
useTicketEvents(ticketId) → GET /api/tickets/[id]/events (staleTime: 1min)

// Mutation hooks (all invalidate ['tickets'] and ['ticket', id])
useUpdateTicket() → PATCH /api/tickets/[id]
useCreateTicketComment() → POST /api/tickets/[id]/comments
useForwardTicket() → POST /api/tickets/[id]/forward
useReassignTicket() → POST /api/admin/tickets/[id]/reassign
useAssignTicket() → POST /api/tickets/[id]/assign
```

### 5.2: Support Ticket Hooks

```typescript
// Query hooks
useSupportTickets(filters) → GET /api/support-tickets (staleTime: 2min)
useSupportTicket(id) → GET /api/support-tickets/[id] (staleTime: 15sec)
  // SMART POLLING: refetchInterval based on status:
  //   3s when ai_triage_status='analyzing' OR remediation_status in ['approved','generating']
  //   5s when ai_triage_status='pending'
  //   false otherwise

// Mutation hooks
useUpdateSupportTicket() → PATCH /api/support-tickets/[id]
useTriggerTriage() → POST /api/support-tickets/[id]/triage
useApproveRemediation() → POST /api/support-tickets/[id]/remediate
useCreateSupportTicketComment() → POST /api/support-tickets/[id]/comments
```

---

## Phase 6: UI Components

Build these components using the user's component library and design system. **Do not copy Linksy's exact markup — adapt to the target site's look and feel.**

### 6.1: Ticket List Page (`/dashboard/tickets`)
- Filterable table: status, provider, date range, search by client name
- Status badges (color-coded)
- SLA indicator (overdue/approaching)
- Pagination
- Bulk actions (status update)

### 6.2: Ticket Detail Page (`/dashboard/tickets/[id]`)
- Header: ticket number, status badge, SLA countdown
- Detail card: client info, provider, service/need, description
- Status management: dropdown with sub-reasons
- Tabs:
  - **Comments**: public/private comments with editor
  - **History**: timeline of all events (assigned, forwarded, status changes)
  - **Call Log**: (optional) log phone calls with timer
- Actions:
  - Assign internally (same org)
  - Forward to admin / another provider
  - Admin reassign

### 6.3: Support Ticket List (`/dashboard/admin/support`)
- Table with: ticket number, subject, status, priority, category, triage status
- Filter by status
- Create new button

### 6.4: Support Ticket Detail (`/dashboard/admin/support/[id]`)
- Header: ticket number, status, priority, category
- Description card
- **AI Triage Card** (the key differentiator):
  - Status indicator: pending → analyzing (spinner) → complete
  - When complete, shows:
    - Severity badge + Classification badge + Complexity badge
    - Root cause hypothesis
    - Suggested fix
    - Investigation steps (ordered list)
    - Affected areas (file paths)
    - Remediation prompt (copyable code block)
    - "Re-run Triage" button
  - **Remediation section**:
    - "Approve & Generate Fix" button
    - Status: approved → generating (spinner) → pr_created
    - When PR created: link to GitHub PR, files changed list, summary
- Comments section (public/internal toggle)

### 6.5: Create Ticket Dialog
- Form: client name, phone, email, provider, service, description
- Custom fields (dynamic, from host config)
- Duplicate detection warning/block UI

### 6.6: Forward Ticket Dialog
- Action: "Forward to Admin" or "Transfer to Provider"
- Reason dropdown: unable_to_assist, wrong_org, capacity, other
- Notes textarea
- Transfer limit warning

---

## Phase 7: Environment Variables

Add these to `.env.local`:

```bash
# Required for AI features
OPENAI_API_KEY=sk-...

# Required for AI remediation (GitHub PR creation)
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
GITHUB_BASE_BRANCH=main

# Required for email notifications
RESEND_API_KEY=re_...          # OR use SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
SMTP_FROM_EMAIL=noreply@yourapp.com
SMTP_FROM_NAME=YourApp
ADMIN_EMAIL=admin@yourcompany.com

# App config
NEXT_PUBLIC_APP_URL=https://yourapp.com
NEXT_PUBLIC_APP_NAME=YourApp
```

---

## Phase 8: NPM Dependencies

```bash
npm install openai @octokit/rest
# If not already installed:
npm install @supabase/supabase-js @tanstack/react-query
```

---

## Phase 9: Customize the AI System Prompts

This is the **most important customization step**. The AI triage and remediation quality depends entirely on how well you describe the target project.

### 9.1: Triage System Prompt (`SYSTEM_ARCHITECTURE`)

Rewrite this constant for your project. Include:
- Platform overview (what the app does)
- Tech stack (framework, database, deployment)
- Key code areas (directory structure with actual paths)
- Database tables (actual table names)
- Auth model (roles, RLS strategy)
- Common issue patterns (known gotchas)

### 9.2: Remediation System Prompt (`PROJECT_CONVENTIONS`)

Rewrite this constant. Include:
- Framework version and file conventions (page.tsx vs index.tsx, etc.)
- Styling rules (Tailwind? CSS Modules? what component library?)
- Import patterns (@ aliases, barrel exports, etc.)
- Directory structure
- Coding patterns (typing, error handling, data fetching)
- File modification rules

---

## Verification Checklist

After installation, verify:

- [ ] Database tables created (check via Supabase dashboard)
- [ ] Can create a ticket via API
- [ ] Can list tickets with filters
- [ ] Can update ticket status
- [ ] Can add comments
- [ ] Audit trail records events automatically
- [ ] Duplicate detection blocks Case B
- [ ] Support ticket creation triggers AI triage
- [ ] Triage result appears in UI (poll until analyzing → complete)
- [ ] Remediation creates GitHub PR
- [ ] Email notifications send (check logs if using dev mode)
- [ ] UI components render with correct styling
- [ ] Status sub-reasons work

---

## Architecture Notes

### Auth Strategy
- Referral tickets: RLS enforced (provider contacts see their tickets, admins see all)
- Support tickets: RLS disabled, auth at API layer (simpler for internal-only)
- Ticket events: immutable, service-role insert only

### Performance
- React Query with staleTime prevents over-fetching
- Smart polling on support ticket detail (only polls while AI is working)
- Database indexes on all filter/sort columns
- Fire-and-forget for emails and webhooks (don't block the response)

### Extensibility
- Status reasons are admin-configurable per tenant
- Webhook events for external integrations
- Custom data JSONB column for per-host form fields
- Email template override system (host-specific > system-wide > hardcoded)
