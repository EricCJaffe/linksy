# Host White-Label Customization

This feature allows host organizations to customize their referral intake experience with personalized email templates and custom form fields.

## Overview

Host white-label customization provides two main capabilities:

1. **Email Template Customization** - Override system email templates with host-specific branding and messaging
2. **Custom Form Fields** - Add custom fields to the referral intake form for collecting host-specific information

## Email Template Customization

### Database Schema

```sql
CREATE TABLE linksy_host_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(host_id, template_key)
);
```

### Available Templates

1. **ticket_new_assignment** - Sent to referral handler when new ticket is created
   - Variables: `app_name`, `contact_name`, `ticket_number`, `client_name`, `need_name`, `description`, `provider_name`, `ticket_url`, `custom_fields`

2. **ticket_status_update** - Sent to client when ticket status changes
   - Variables: `app_name`, `client_name`, `ticket_number`, `status_label`, `provider_name`, `need_name`

### Template Resolution Hierarchy

1. **Host-specific template** (if exists) - `linksy_host_email_templates`
2. **System override template** (if exists) - `linksy_email_templates`
3. **Default hardcoded template** - Fallback in `lib/utils/email.ts`

### Usage

Email functions in `lib/utils/email.ts` accept an optional `hostId` parameter:

```typescript
await sendNewTicketNotification({
  to: 'handler@example.com',
  contactName: 'John Doe',
  ticketNumber: 'LINK-20260224-0001',
  clientName: 'Jane Smith',
  needName: 'Food Assistance',
  description: 'Need help with groceries',
  providerName: 'Community Food Bank',
  ticketUrl: 'https://app.example.com/tickets/123',
  customData: { insurance: 'Blue Cross' },
  customFields: [{ field_label: 'Insurance Provider', field_type: 'text' }],
  hostId: 'uuid-of-host-provider',
})
```

### Admin UI

Navigate to: **Dashboard > Admin > Hosts > [Host Name] > Email Templates**

Features:
- Select from available templates
- Edit subject and HTML body
- Preview available variables
- Reset to system default
- Active/inactive toggle

## Custom Form Fields

### Database Schema

```sql
CREATE TABLE linksy_host_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  field_label VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'checkbox', 'date', 'email', 'phone')),
  field_options TEXT[] DEFAULT '{}',
  placeholder VARCHAR(200),
  help_text VARCHAR(500),
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom field responses stored in tickets
ALTER TABLE linksy_tickets ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;
```

### Supported Field Types

- **text** - Single-line text input
- **textarea** - Multi-line text input
- **email** - Email address with validation
- **phone** - Phone number input
- **date** - Date picker
- **select** - Dropdown with predefined options
- **checkbox** - Boolean yes/no

### Field Configuration

Each field can specify:
- `field_label` - Display label (required)
- `field_type` - Input type (required)
- `field_options` - Options for select fields
- `placeholder` - Placeholder text
- `help_text` - Help text shown below field
- `is_required` - Whether field is required
- `is_active` - Whether field is shown to users
- `sort_order` - Display order

### Usage in Widget

Custom fields are automatically fetched and rendered in the referral intake form when `hostProviderId` is provided:

```typescript
<CreateTicketDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  providerId="provider-uuid"
  providerName="Community Services"
  hostProviderId="host-uuid"
/>
```

### Data Storage

Custom field responses are stored in `linksy_tickets.custom_data` as JSONB:

```json
{
  "Insurance Provider": "Blue Cross Blue Shield",
  "Preferred Language": "Spanish",
  "Has Transportation": true,
  "Best Contact Time": "Morning"
}
```

### Email Integration

Custom field responses are automatically formatted and included in email notifications via the `{{custom_fields}}` variable. The `formatCustomFields()` helper function generates HTML table rows for display.

### Admin UI

Navigate to: **Dashboard > Admin > Hosts > [Host Name] > Custom Form Fields**

Features:
- Add new custom fields
- Edit existing fields
- Drag to reorder (visual indicator)
- Toggle active/inactive
- Delete fields
- Field type validation

## API Endpoints

### Email Templates

**List templates:**
```
GET /api/hosts/[hostId]/email-templates
```

**Create/update template:**
```
POST /api/hosts/[hostId]/email-templates
Body: { template_key, name, subject, body_html, variables }
```

**Update template:**
```
PATCH /api/hosts/[hostId]/email-templates/[templateId]
Body: { name?, subject?, body_html?, variables?, is_active? }
```

**Delete template (revert to default):**
```
DELETE /api/hosts/[hostId]/email-templates/[templateId]
```

### Custom Fields

**List fields:**
```
GET /api/hosts/[hostId]/custom-fields?include_inactive=true
```

**Create field:**
```
POST /api/hosts/[hostId]/custom-fields
Body: { field_label, field_type, field_options?, placeholder?, help_text?, is_required?, sort_order? }
```

**Update field:**
```
PATCH /api/hosts/[hostId]/custom-fields/[fieldId]
Body: { field_label?, field_type?, field_options?, placeholder?, help_text?, is_required?, sort_order?, is_active? }
```

**Delete field:**
```
DELETE /api/hosts/[hostId]/custom-fields/[fieldId]
```

## Access Control

Both features require site admin or host admin permissions:

```typescript
// Site admin check
if (!auth.isSiteAdmin) {
  // Check host admin
  const { data: contact } = await supabase
    .from('linksy_provider_contacts')
    .select('id')
    .eq('provider_id', hostId)
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .in('contact_type', ['provider_admin', 'org_admin'])
    .maybeSingle()

  if (!contact) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
}
```

Public access to custom fields (for widget display) is allowed via RLS policies for active fields only.

## Components

### Admin Components

- `components/admin/hosts/email-template-editor.tsx` - Email template customization UI
- `components/admin/hosts/custom-form-builder.tsx` - Custom field management UI
- `app/dashboard/admin/hosts/[hostId]/page.tsx` - Host settings page with tabs

### Widget Components

- `components/tickets/create-ticket-dialog.tsx` - Updated to fetch and render custom fields

## Files Modified

### Database Migrations
- `supabase/migrations/20260224160000_create_host_email_templates.sql`
- `supabase/migrations/20260224160100_create_host_custom_fields.sql`

### API Routes
- `app/api/hosts/[hostId]/email-templates/route.ts` (new)
- `app/api/hosts/[hostId]/email-templates/[templateId]/route.ts` (new)
- `app/api/hosts/[hostId]/custom-fields/route.ts` (new)
- `app/api/hosts/[hostId]/custom-fields/[fieldId]/route.ts` (new)
- `app/api/tickets/route.ts` (updated - accept custom_data)
- `app/api/tickets/[id]/route.ts` (updated - pass hostId to email)
- `app/api/linksy/tickets/route.ts` (updated - accept custom_data)

### Utilities
- `lib/utils/email.ts` (updated - template resolution, formatCustomFields)

### Types
- `lib/types/linksy.ts` (updated - HostEmailTemplate, HostCustomField interfaces)

## Testing

1. **Email Templates**
   - Navigate to host settings
   - Create a custom email template
   - Submit a test referral and verify email uses custom template
   - Delete template and verify fallback to default

2. **Custom Fields**
   - Add various field types (text, select, checkbox, etc.)
   - Test required field validation
   - Submit referral with custom field data
   - Verify data is stored in ticket.custom_data
   - Verify fields appear in notification email

3. **Access Control**
   - Verify site admins can manage all host templates/fields
   - Verify host admins can only manage their own host
   - Verify non-admins cannot access management UI

## Future Enhancements

- [ ] Rich text editor for email template body
- [ ] Email template preview with sample data
- [ ] Drag-and-drop field reordering (currently visual only)
- [ ] Conditional field visibility rules
- [ ] Field value validation rules (regex, min/max)
- [ ] Import/export templates between hosts
- [ ] Template versioning and history
- [ ] Multi-language template support
- [ ] Custom CSS/branding for widget
