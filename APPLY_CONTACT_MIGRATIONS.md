# Apply Contact Invite Migrations

## What These Migrations Fix

1. ✅ Email and full_name now display for invited contacts
2. ✅ Invite flow works correctly
3. ✅ Automatic linking when users accept invitations

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/vjusthretnfmxmgdiwtw
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the content of BOTH migration files:

#### Migration 1: Add email and full_name fields

```sql
-- Copy the entire contents of:
-- supabase/migrations/20260224200000_add_contact_email_fullname.sql
```

Run it, then:

#### Migration 2: Add auto-linking trigger

```sql
-- Copy the entire contents of:
-- supabase/migrations/20260224201000_link_invited_users_to_contacts.sql
```

Run it.

### Option 2: Using Supabase CLI

If you have the Supabase CLI set up:

```bash
# Apply all pending migrations
supabase db push
```

## Verification

After applying the migrations, verify they worked:

```sql
-- Check that new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'linksy_provider_contacts'
  AND column_name IN ('email', 'full_name');

-- Should return 2 rows showing email and full_name columns

-- Check that trigger was created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'link_invited_user_trigger';

-- Should return 1 row
```

## Testing the Fix

1. **Add a new contact** with a non-existent email (e.g., `test@example.com`)
   - Email and full_name should now appear in the contacts list
   - Status badge should show "Invited"

2. **Send an invitation**
   - Click "Send Invite" button
   - Should succeed without 400 error
   - User should receive invitation email from Supabase

3. **User accepts invitation**
   - When user clicks link in email and sets password
   - Contact record should automatically link to new user
   - Status should change from "Invited" to "Active"
   - Email/full_name should now come from user table

## Cleanup Old Data

If you have existing invited contacts without email/full_name, you may need to:

1. Delete them and re-create with the new code
2. Or manually update them with SQL:

```sql
-- Update existing invited contacts (replace with actual values)
UPDATE linksy_provider_contacts
SET
  email = 'actual-email@example.com',
  full_name = 'Actual Name'
WHERE id = 'contact-uuid-here'
  AND user_id IS NULL
  AND status = 'invited';
```

## Troubleshooting

### "Email is required to send invitation"

The contact was created before the migration. Either:
- Delete and re-create the contact
- Manually update with SQL above

### Email/full_name still not showing

1. Check migration was applied: `\d linksy_provider_contacts` in psql
2. Verify contact has email set: `SELECT email, full_name FROM linksy_provider_contacts WHERE id = 'contact-id';`
3. Hard refresh the page (Cmd/Ctrl + Shift + R)
4. Check browser console for errors

### Invitation not sent

1. Check Supabase email templates are configured
2. Check SMTP settings in Supabase Dashboard → Authentication → Email Templates
3. Check Supabase logs for errors
