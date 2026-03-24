# Support Ticket Module — Architecture Reference

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Public User    │────→│  POST /api/public │────→│  linksy_tickets │
│  (Find Help)     │     │  /tickets         │     │  (Supabase)     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
┌─────────────────┐     ┌──────────────────┐              │
│  Provider Staff  │────→│  Dashboard UI    │──────────────┤
│  (Intake)        │     │  /dashboard/     │              │
└─────────────────┘     │  tickets/[id]    │     ┌────────▼────────┐
                         └──────────────────┘     │ linksy_ticket_  │
┌─────────────────┐     ┌──────────────────┐     │ events (audit)  │
│  Site Admin      │────→│  Admin Console   │     └─────────────────┘
│                  │     │  /dashboard/     │
└─────────────────┘     │  admin/support   │
                         └───────┬──────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Support Tickets        │
                    │  linksy_support_tickets │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  AI Triage (GPT-4o-mini)│
                    │  Classification +       │
                    │  Severity + Fix Prompt  │
                    └────────────┬────────────┘
                                 │ Admin approves
                    ┌────────────▼────────────┐
                    │  AI Remediation (GPT-4o)│
                    │  Read files → Generate  │
                    │  fix → Create GitHub PR │
                    └─────────────────────────┘
```

## Two Ticket Types

### 1. Referral Tickets (`linksy_tickets`)
- **Who creates:** End users (public widget) or staff (admin dashboard)
- **Who handles:** Provider contacts (intake specialists)
- **Lifecycle:** pending → in_process → service_provided / unable_to_assist / transferred
- **Features:** Duplicate detection, SLA tracking, forwarding, reassignment, audit trail

### 2. Support Tickets (`linksy_support_tickets`)
- **Who creates:** Provider staff (when they have a platform issue)
- **Who handles:** Site admins
- **Lifecycle:** open → in_progress → resolved → closed
- **Features:** AI triage (auto-analyze), AI remediation (auto-fix via GitHub PR)

## AI Pipeline

### Triage Flow
```
Support ticket created
  → Fire-and-forget: triageSupportTicket()
    → Mark ai_triage_status = 'analyzing'
    → Send to GPT-4o-mini with SYSTEM_ARCHITECTURE context
    → Parse JSON response (classification, severity, affected_areas, remediation_prompt, ...)
    → Save to ai_triage column, mark ai_triage_status = 'complete'
    → Send email to ADMIN_EMAIL with formatted triage report
```

**UI polls** every 3-5 seconds while status is 'pending' or 'analyzing', stops when 'complete'.

### Remediation Flow
```
Admin clicks "Approve & Generate Fix"
  → POST /api/support-tickets/[id]/remediate
    → Mark remediation_status = 'approved', then 'generating'
    → Read affected_areas files from GitHub via Octokit
    → Send to GPT-4o with PROJECT_CONVENTIONS + file contents + triage analysis
    → Parse JSON response: { changes[], commit_message, summary }
    → Create GitHub branch: fix/support-<ticket-number>
    → Create tree → commit → PR on base branch
    → Mark remediation_status = 'pr_created', save PR URL
    → Send email to admin with PR link
```

## Duplicate Detection Rules

| Case | Condition | Action |
|------|-----------|--------|
| **B** | Same client + same provider + same service + within 30 days | **BLOCK** (reject creation) |
| **A** | Same client + 5+ providers + same service + same day | FLAG (allow, mark for review) |
| **C** | Same client + same provider + consecutive days | FLAG |
| **D** | Same client + same service category + same week | FLAG |

Client identity matched by email OR phone.

## Ticket Forwarding

Two modes:
1. **Forward to Admin Pool:** Orphans ticket (provider_id=null), status=transferred_another_provider. Admin can then reassign to any provider.
2. **Forward to Provider:** Transfers to specific provider, status=transferred_pending. Auto-assigns to their default handler.

Transfer limit: max 2 per ticket (admin can override).

## Audit Trail

Every ticket action creates an immutable `linksy_ticket_events` record:
- event_type: created, assigned, reassigned, forwarded, status_changed, comment_added, updated
- Captures previous_state and new_state as JSONB
- actor_id + actor_type for attribution
- reason + notes for context
- Inserted via `linksy_record_ticket_event()` (SECURITY DEFINER function)

## Email Notifications

| Event | Recipient | Template |
|-------|-----------|----------|
| Ticket created | Default referral handler | New ticket notification |
| Status changed | Client (if email exists) | Status update |
| Assigned internally | New assignee | Assignment notification |
| Forwarded to admin | All site admins | Forward notification |
| Forwarded to provider | New provider's handler | Transfer notification |
| Reassigned by admin | New assignee | Reassignment notification |
| AI triage complete | ADMIN_EMAIL | Triage report (HTML) |
| AI remediation PR created | ADMIN_EMAIL | PR ready for review |

All emails are **fire-and-forget** (non-blocking).

## Smart Polling Strategy

The support ticket detail view uses React Query's `refetchInterval` dynamically:
- **3 seconds** when: `ai_triage_status = 'analyzing'` OR `remediation_status in ['approved', 'generating']`
- **5 seconds** when: `ai_triage_status = 'pending'`
- **Disabled** otherwise (no polling when everything is settled)

This prevents hammering the server while giving fast feedback during AI processing.
