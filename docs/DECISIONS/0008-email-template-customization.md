# 8. Email Template Customization System

Date: 2026-02-24

## Status

Accepted

## Context

The application sends transactional emails for various events (user invitations, ticket assignments, status updates). Initially, email content was hardcoded in the email utility functions. As the platform evolved, different tenants/hosts expressed the need to customize email messaging to match their brand voice and include organization-specific information.

Requirements:
1. Allow admins to customize email templates without code deployments
2. Maintain default templates as fallback when no customization exists
3. Support dynamic placeholder substitution (ticket numbers, client names, etc.)
4. Provide a safe editing interface that prevents breaking email functionality
5. Track which templates are customized vs using defaults

## Decision

We implemented a database-backed email template override system with the following design:

### Database Layer
- **Table:** `linksy_email_templates`
- **Columns:** `template_key`, `subject`, `html_body`, `created_at`, `updated_at`
- **Policy:** Admin-only write access; templates are site-wide (not tenant-scoped in current single-site mode)

### Template Registry
- **File:** `lib/email/template-registry.ts`
- **Defines:** Template keys, names, descriptions, and available placeholders for each template
- **Type-safe:** Uses TypeScript const assertions and type narrowing for compile-time safety

### Runtime Resolution
- **Utility:** `lib/utils/email.ts`
- **Pattern:** Query `linksy_email_templates` for override; fall back to hardcoded default if not found
- **Placeholder rendering:** Simple string replacement of `{{placeholder_name}}` tokens
- **Validation:** Placeholder availability documented in template registry; admin UI shows available placeholders per template

### Admin UI
- **Path:** `/dashboard/admin/email-templates`
- **Features:**
  - List view showing all template types
  - "Customized" badge for overridden templates
  - Edit form with subject + HTML body text areas
  - Placeholder reference panel (shows available tokens per template)
  - Preview capability (future enhancement)
  - Reset to default option (deletes override record)

### Supported Templates (as of Feb 2026)
1. **User Invitation** (`invitation`) — sent when inviting provider contacts
2. **New Referral Assignment** (`ticket_new_assignment`) — sent to default referral handler on ticket creation
3. **Referral Status Update** (`ticket_status_update`) — sent to client when ticket status changes

## Consequences

### Positive
- Admins can customize email messaging without developer intervention
- Template changes take effect immediately (no deployment required)
- Defaults ensure emails always work even if no customization exists
- Type-safe template key validation prevents runtime errors from invalid template references
- Clear separation between template definition (code) and template content (database)
- Easy to add new templates: add to registry + call email utility with template key

### Negative
- Email HTML is stored as plain text (no rich editor validation in initial version)
- No preview/test send feature in initial version (planned enhancement)
- Placeholder validation is documentation-based, not enforced at save time
- Template versioning not supported (future consideration for A/B testing or rollback)

### Mitigations
- Admin UI displays available placeholders to guide correct usage
- Hardcoded defaults ensure broken customizations can be reset
- Future: Add rich HTML editor with placeholder autocomplete
- Future: Add preview + test send capability
- Future: Consider template versioning for audit trail

## Alternatives Considered

### 1. File-based templates with deployment
Store templates as files in `templates/` directory. Rejected because it requires code deployments for every template change and lacks flexibility for multi-tenant scenarios.

### 2. External email service with template management (SendGrid, Postmark)
Use a third-party service's built-in template system. Rejected to maintain flexibility and avoid vendor lock-in; we wanted full control over rendering logic and data residency.

### 3. CMS-based template management
Integrate a headless CMS for template storage. Rejected as over-engineered for current needs; database-backed approach is simpler and keeps all data in Supabase.

## Implementation Notes

- Migration: `supabase/migrations/20260223133000_create_email_templates.sql`
- Template registry defines the schema; database stores overrides only
- If a tenant-scoped version is needed in the future, add `tenant_id` column and update RLS policies
- Placeholder syntax (`{{token}}`) chosen for simplicity; future could support Handlebars or Liquid for logic

## References

- Email utility: `lib/utils/email.ts`
- Template registry: `lib/email/template-registry.ts`
- Admin UI: `app/dashboard/admin/email-templates/page.tsx`
- API endpoints: `app/api/admin/email-templates/route.ts`, `app/api/admin/email-templates/[templateKey]/route.ts`
- Related ADR: [0004-email-notifications-design.md](0004-email-notifications-design.md)
