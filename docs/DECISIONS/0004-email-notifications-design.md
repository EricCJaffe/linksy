# 0004 Transactional Email — Ticket Notifications

## Date
2026-02-18

## Status
Accepted

## Context

When a referral ticket is created or its status changes, stakeholders need to be
notified. The options were:

1. **Supabase Auth email only** — works for user invitations but cannot be used for custom domain events
2. **In-app notifications only** — requires users to be logged in to see updates; clients typically aren't logged in
3. **External email service** — sends actual emails for event-driven notifications

For provider contact invitations, `supabase.auth.admin.inviteUserByEmail` already
handles the email. No separate email service is needed for that flow.

Options for transactional emails:
- **Resend** — clean API, generous free tier, recommended for new projects
- **Nodemailer / SMTP** — already in `package.json`, more flexible for self-hosted
- **Both, with priority** — Resend first, SMTP as fallback

## Decision

Use `lib/utils/email.ts` (pre-existing utility) which:
1. Tries **Resend** first (`RESEND_API_KEY`)
2. Falls back to **SMTP via Nodemailer** (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)
3. **Logs to console** if neither is configured (safe in dev — no accidental sends)

Two notification triggers added (fire-and-forget, `void (async () => {...})()`):
- `POST /api/tickets` → `sendNewTicketNotification` → default referral handler's email (looked up via `supabase.auth.admin.getUserById`)
- `PATCH /api/tickets/[id]` → `sendTicketStatusNotification` → `ticket.client_email` (if set)

Templates are plain HTML inline-styled for maximum email client compatibility.

## Consequences

- **Dev safety:** No env vars = console log only. Zero risk of sending real emails in dev.
- **Decoupled:** Email sending is fire-and-forget; ticket API responds immediately even if email fails.
- **Error visibility:** Failures logged via `console.error` with `[ticket email]` prefix; not surfaced to the API caller.
- **Limitation:** Client email (`client_email`) must be recorded at ticket creation time. If not present, no status update is sent.
- **Future:** Could add a queue/retry layer (e.g., Supabase Edge Functions + pg_cron) for reliable delivery guarantees.

## Links
- `lib/utils/email.ts` — `sendNewTicketNotification`, `sendTicketStatusNotification`
- `app/api/tickets/route.ts` — POST hook
- `app/api/tickets/[id]/route.ts` — PATCH hook
- `docs/ENVIRONMENT.md` — email env vars
