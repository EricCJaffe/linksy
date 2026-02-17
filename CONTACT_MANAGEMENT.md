# Contact Management System

## Overview
Comprehensive contact management for provider organizations with role-based permissions and user invitations.

## Contact Fields

### Basic Information
- **Email** (required, unique per provider)
- **Full Name**
- **Phone Number**
- **Job Title**

### Classification
- **Contact Type**: Provider Employee or Customer (relationship to organization)
- **Provider Role**: Admin or User (permission level)
  - **Admin**: Full access to edit company details, manage contacts, manage referrals
  - **User**: Can only manage referrals (limited permissions)

### Status
- **Active**: Contact has account and full access
- **Invited**: Invitation sent, awaiting account creation
- **Archived**: No longer active, hidden from lists

### Flags
- **Primary Contact**: Main point of contact for the organization
- **Default Referral Handler**: New referrals automatically assign to this contact

## Features

### 1. Add New Contact
- Click "Add Contact" button in Contacts tab
- Fill in required fields (email, provider role)
- System checks if user exists with that email
- If user doesn't exist, contact status is set to "Invited"
- Invitation email sent automatically (requires Supabase email templates)

### 2. Edit Contact
- Click "Edit" button next to any contact
- Update job title, phone, role, and flags
- Email cannot be changed (tied to user account)
- Full name is managed by user's profile

### 3. Archive Contact
- Click "Archive" button to remove access
- Archived contacts are hidden from all lists
- Cannot archive the last active admin (system protection)

### 4. Resend Invitation
- For contacts in "Invited" status
- Click "Resend Invite" to send another invitation email
- Useful if initial email was missed or expired

### 5. Set Default Handler
- Only one default handler per provider
- Setting a new default automatically removes the flag from previous default
- New referrals auto-assign to this contact

## Role-Based Permissions

### Provider Admin
- View and edit all company information
- Manage all contacts (add, edit, archive)
- Manage all referrals
- Access all tabs in provider portal

### Provider User
- View company information (read-only)
- Manage referrals only
- Cannot add/edit/archive contacts
- Limited tab access in provider portal

### Site Admin
- Full access to all providers
- Can manage contacts for any provider
- Can preview provider portal view

## User Invitation Flow

1. **Admin adds contact** with email address
2. **System checks** if user exists
3. **If new user**:
   - Status set to "Invited"
   - Invitation email sent via Supabase Auth
   - Email contains magic link to create account
4. **User clicks link** and creates password
5. **On account creation**:
   - Contact status changes to "Active"
   - User can log in and access provider portal
6. **If user exists**:
   - Contact immediately set to "Active"
   - User gains access to this provider's portal

## Database Protection

### Triggers
- **ensure_provider_has_admin**: Prevents removing the last active admin
- **enforce_single_default_referral_handler**: Ensures only one default handler per provider

### Constraints
- Provider role must be 'admin' or 'user'
- Status must be 'active', 'archived', or 'invited'
- Active contacts filtered by default in all queries

## API Endpoints

### Create Contact
```
POST /api/providers/[id]/contacts
Body: { email, full_name, job_title, phone, provider_role, etc. }
```

### Update Contact
```
PATCH /api/providers/[id]/contacts/[contactId]
Body: { job_title, phone, provider_role, etc. }
```

### Archive Contact
```
DELETE /api/providers/[id]/contacts/[contactId]
```

### Send Invitation
```
POST /api/providers/[id]/contacts/[contactId]/invite
Body: { email, full_name }
```

### Set Default Handler
```
POST /api/providers/[id]/contacts/[contactId]/set-default-handler
```

## UI Locations

### Admin View
- **Providers** → Select provider → **Contacts** tab
- Full CRUD access to all contacts

### Provider Portal View
- **My Organization** → **Contacts** tab
- Access controlled by provider role:
  - Admins: Full CRUD access
  - Users: View only (coming soon)

## Notes

- **Not all contacts need user accounts**: Some contacts can be informational only
- **Email invitations require configuration**: Set up email templates in Supabase dashboard
- **Primary contact suggested**: First contact should be marked as primary and default handler
- **Contact type vs Provider role**: Type indicates relationship (employee/customer), Role controls permissions (admin/user)
