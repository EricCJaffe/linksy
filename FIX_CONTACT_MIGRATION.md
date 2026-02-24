# Fix Contact Migration Issue

## Problem

Some existing contact records have both `user_id = NULL` and `email = NULL`, which violates the constraint we're trying to add.

## Solution

Run these SQL queries in order in the Supabase SQL Editor:

### Step 1: Identify Problematic Records

```sql
-- Find contacts with neither user_id nor email
SELECT
  id,
  provider_id,
  job_title,
  phone,
  status,
  created_at
FROM linksy_provider_contacts
WHERE user_id IS NULL
  AND (email IS NULL OR email = '');
```

**Review these records.** They are likely incomplete test data or orphaned records.

### Step 2: Clean Up Options

Choose ONE of these options:

#### Option A: Delete Invalid Records (Recommended if they're test data)

```sql
-- Delete contacts with neither user_id nor email
DELETE FROM linksy_provider_contacts
WHERE user_id IS NULL
  AND (email IS NULL OR email = '');
```

#### Option B: Add Placeholder Emails (If you want to keep the records)

```sql
-- Add placeholder emails to invalid contacts
UPDATE linksy_provider_contacts
SET email = CONCAT('placeholder-', id::text, '@example.com')
WHERE user_id IS NULL
  AND (email IS NULL OR email = '');
```

### Step 3: Verify Cleanup

```sql
-- Should return 0 rows
SELECT COUNT(*) as invalid_contacts
FROM linksy_provider_contacts
WHERE user_id IS NULL
  AND (email IS NULL OR email = '');
```

### Step 4: Apply Migration (MODIFIED VERSION)

After cleanup, run this **modified** migration that won't fail:

```sql
-- Add email and full_name columns (these may already exist from first attempt)
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Only add constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_contacts_user_or_email'
  ) THEN
    ALTER TABLE linksy_provider_contacts
    ADD CONSTRAINT provider_contacts_user_or_email
    CHECK (user_id IS NOT NULL OR email IS NOT NULL);
  END IF;
END $$;

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_provider_contacts_email
ON linksy_provider_contacts(email)
WHERE email IS NOT NULL;

COMMENT ON COLUMN linksy_provider_contacts.email IS 'Temporary email storage for invited contacts (NULL once user_id is set)';
COMMENT ON COLUMN linksy_provider_contacts.full_name IS 'Temporary full_name storage for invited contacts (NULL once user_id is set)';
```

### Step 5: Apply Auto-Linking Trigger

Then run the second migration from `20260224201000_link_invited_users_to_contacts.sql`:

```sql
-- Automatically link invited users to their provider contact when they sign up

CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email since we now have user_id
      full_name = NULL  -- Clear temporary full_name since we now have user_id
    WHERE id = v_contact_id
      AND user_id IS NULL;  -- Only update if not already linked

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email
      full_name = NULL  -- Clear temporary full_name
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status = 'invited';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.users table (after handle_new_user creates the record)
DROP TRIGGER IF EXISTS link_invited_user_trigger ON public.users;

CREATE TRIGGER link_invited_user_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION link_invited_user_to_contact();

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record when they sign up';
```

## Verification

After all steps complete successfully:

```sql
-- Verify constraint exists
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'provider_contacts_user_or_email';

-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'link_invited_user_trigger';

-- Check all contacts are valid
SELECT
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user,
  COUNT(*) FILTER (WHERE user_id IS NULL AND email IS NOT NULL) as invited_pending
FROM linksy_provider_contacts;
```

All counts should add up correctly with no orphaned records.
