# 0014 Email Delivery Fallback Model

## Date
2026-02-26

## Status
Accepted

## Context
The app sends operational emails (ticket assignment, status updates, onboarding notifications) in both local and deployed environments. We need reliable delivery in production while keeping local development safe and simple when email infrastructure is not configured.

## Decision
Use a tiered delivery strategy in `lib/utils/email.ts`:
1. Resend as the primary provider when `RESEND_API_KEY` is set.
2. SMTP fallback via Nodemailer when SMTP credentials are configured.
3. Development-safe fallback that logs email payloads when neither provider is configured.

Email body/subject customization is data-driven through the `linksy_email_templates` table, with runtime placeholder rendering and default template fallbacks.

## Consequences
- Production can use a managed provider (Resend) while preserving SMTP compatibility for organizations with existing mail infrastructure.
- Local development and CI can exercise notification code paths without sending external email.
- Operators must ensure at least one real provider is configured in production to avoid no-op/log-only delivery.

## Links
- `lib/utils/email.ts`
- `app/api/tickets/route.ts`
- `app/api/tickets/[id]/route.ts`
- `docs/INTEGRATIONS.md`
- `docs/ENVIRONMENT.md`
