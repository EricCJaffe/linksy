# Support Ticket Module — API Contracts

Complete request/response specifications for all API routes.

---

## Referral Ticket Routes

### `POST /api/public/tickets` — Public Ticket Creation
**Auth:** None (rate limited)

**Request:**
```json
{
  "provider_id": "uuid (required)",
  "need_id": "uuid (required)",
  "client_name": "string (optional)",
  "client_phone": "string (required if no email)",
  "client_email": "string (required if no phone)",
  "description_of_need": "string (optional)",
  "host_provider_id": "uuid (optional, for embedded widget)",
  "search_session_id": "uuid (optional)",
  "custom_data": { "key": "value" }
}
```

**Response (201):**
```json
{
  "success": true,
  "ticket_number": "R-2001-07",
  "message": "Your referral has been submitted successfully."
}
```

**Error (400):** Duplicate blocked
```json
{
  "error": "A referral for this client to this provider for the same service already exists within the last 30 days (R-2001-07)."
}
```

**Error (429):** Rate limited
```json
{
  "error": "Too many referrals. Please wait before submitting another."
}
```

---

### `GET /api/tickets` — List Tickets
**Auth:** Required

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| q | string | - | Search client name |
| status | string | 'all' | Filter by status or 'all' |
| provider_id | uuid | - | Filter by provider |
| need_id | uuid | - | Filter by service |
| date_from | ISO string | - | Created after |
| date_to | ISO string | - | Created before |
| client_email | string | - | Filter by client email |
| client_phone | string | - | Filter by client phone |
| zip | string | - | Filter by provider location ZIP |
| limit | 1-100 | 50 | Page size |
| offset | number | 0 | Pagination offset |

**Response (200):**
```json
{
  "tickets": [
    {
      "id": "uuid",
      "ticket_number": "R-2001-07",
      "status": "pending",
      "client_name": "Jane Doe",
      "client_email": "jane@example.com",
      "client_phone": "904-555-1234",
      "description_of_need": "Need help with rent",
      "is_test": false,
      "duplicate_flag_type": null,
      "sla_due_at": "2026-03-26T12:00:00Z",
      "created_at": "2026-03-24T12:00:00Z",
      "provider": { "id": "uuid", "name": "Provider Org" },
      "need": { "id": "uuid", "name": "Rental Assistance" },
      "status_reason": null
    }
  ],
  "pagination": {
    "total": 142,
    "hasMore": true,
    "nextOffset": 50
  }
}
```

---

### `POST /api/tickets` — Create Ticket (Admin)
**Auth:** Admin required

**Request:**
```json
{
  "site_id": "uuid (required)",
  "provider_id": "uuid (optional)",
  "need_id": "uuid (optional)",
  "client_name": "string",
  "client_phone": "string",
  "client_email": "string",
  "description_of_need": "string",
  "status": "pending",
  "source": "dashboard",
  "custom_data": {},
  "is_test": false,
  "force": false
}
```

**Response (201):** Same as public endpoint.

---

### `GET /api/tickets/[id]` — Get Ticket Detail
**Auth:** Required

**Response (200):** Full ticket object with all relations (provider, need, comments, status_reason).

---

### `PATCH /api/tickets/[id]` — Update Ticket
**Auth:** Required

**Request (admin):**
```json
{
  "status": "in_process",
  "status_reason_id": "uuid or null",
  "description_of_need": "updated text",
  "client_name": "string",
  "provider_id": "uuid",
  "need_id": "uuid"
}
```

**Request (provider contact):**
```json
{
  "status": "in_process",
  "status_reason_id": "uuid or null",
  "follow_up_sent": true
}
```

---

### `POST /api/tickets/[id]/comments` — Add Comment
**Auth:** Required

**Request:**
```json
{
  "content": "Called client, scheduled appointment for Thursday.",
  "is_private": false
}
```

---

### `GET /api/tickets/[id]/events` — Get Audit Trail
**Auth:** Required

**Response (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "ticket_id": "uuid",
      "event_type": "status_changed",
      "actor_id": "uuid",
      "actor_type": "provider_contact",
      "previous_state": { "status": "pending" },
      "new_state": { "status": "in_process" },
      "reason": null,
      "notes": null,
      "created_at": "2026-03-24T14:00:00Z",
      "actor": { "full_name": "John Smith", "email": "john@provider.org" }
    }
  ]
}
```

---

### `POST /api/tickets/[id]/assign` — Internal Assignment
**Auth:** Required (same org)

**Request:**
```json
{
  "assigned_to_user_id": "uuid (required)",
  "notes": "Taking over while Sarah is on vacation"
}
```

---

### `POST /api/tickets/[id]/forward` — Forward Ticket
**Auth:** Required

**Request:**
```json
{
  "action": "forward_to_admin | forward_to_provider",
  "target_provider_id": "uuid (required if forward_to_provider)",
  "reason": "unable_to_assist | wrong_org | capacity | other",
  "notes": "Client needs services we don't offer",
  "admin_override": false
}
```

---

### `POST /api/admin/tickets/[id]/reassign` — Admin Reassignment
**Auth:** Admin required

**Request:**
```json
{
  "target_provider_id": "uuid (required)",
  "target_contact_id": "uuid (optional)",
  "reason": "string",
  "notes": "string",
  "preserve_history": false
}
```

---

### `PATCH /api/tickets/bulk` — Bulk Status Update
**Auth:** Admin required

**Request:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "status": "in_process"
}
```

**Response (200):**
```json
{
  "updated": 3,
  "emailsSent": 2
}
```

---

## Support Ticket Routes

### `POST /api/support-tickets` — Create Support Ticket
**Auth:** Required

**Request:**
```json
{
  "subject": "Search widget not returning results",
  "description": "When I search for 'food pantry' the widget shows an error...",
  "category": "technical",
  "priority": "high",
  "provider_id": "uuid (optional)"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "ticket_number": "SUP-20260324-0001",
  "subject": "Search widget not returning results",
  "status": "open",
  "priority": "high",
  "ai_triage_status": "pending",
  "created_at": "2026-03-24T15:00:00Z"
}
```

*AI triage fires asynchronously after creation.*

---

### `GET /api/support-tickets/[id]` — Get Support Ticket Detail
**Auth:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "ticket_number": "SUP-20260324-0001",
  "subject": "Search widget not returning results",
  "description": "...",
  "status": "open",
  "priority": "high",
  "category": "technical",
  "ai_triage_status": "complete",
  "ai_triage": {
    "classification": "bug",
    "severity": "high",
    "affected_areas": ["app/api/linksy/search/route.ts", "components/widget/find-help-widget.tsx"],
    "root_cause_hypothesis": "The search route references a non-existent column...",
    "suggested_fix": "Remove the .eq('is_frozen', false) filter or add the column...",
    "remediation_prompt": "In app/api/linksy/search/route.ts, find the line...",
    "investigation_steps": ["Check the search route for column references", "..."],
    "confidence": 0.85,
    "estimated_complexity": "small"
  },
  "remediation_status": "none",
  "remediation_pr_url": null,
  "comments": []
}
```

---

### `POST /api/support-tickets/[id]/triage` — Trigger AI Triage
**Auth:** Admin required

**Response (200):**
```json
{
  "triage": {
    "classification": "bug",
    "severity": "high",
    "affected_areas": ["..."],
    "root_cause_hypothesis": "...",
    "suggested_fix": "...",
    "remediation_prompt": "...",
    "investigation_steps": ["..."],
    "confidence": 0.85,
    "estimated_complexity": "small"
  }
}
```

---

### `POST /api/support-tickets/[id]/remediate` — Approve AI Remediation
**Auth:** Admin required

**Response (200):**
```json
{
  "status": "pr_created",
  "pr_url": "https://github.com/org/repo/pull/42",
  "branch": "fix/support-sup-20260324-0001",
  "summary": "Removed the is_frozen filter that referenced a non-existent column.",
  "files_changed": [
    { "path": "app/api/linksy/search/route.ts", "summary": "Modified app/api/linksy/search/route.ts" }
  ]
}
```

---

## Webhook Events

If you implement webhooks, these events are fired:

| Event | Trigger |
|-------|---------|
| `ticket.created` | New referral ticket |
| `ticket.status_changed` | Status update |
| `ticket.assigned` | Internal assignment |
| `ticket.forwarded` | Forward to admin/provider |
| `ticket.reassigned` | Admin reassignment |

Payload format:
```json
{
  "event": "ticket.created",
  "timestamp": "2026-03-24T15:00:00Z",
  "data": {
    "ticket_id": "uuid",
    "ticket_number": "R-2001-07",
    "status": "pending",
    "provider_id": "uuid"
  }
}
```
