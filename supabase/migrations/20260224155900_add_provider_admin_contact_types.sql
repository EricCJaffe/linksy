-- Add admin contact types for provider contacts
-- Required for policies that reference provider_admin/org_admin

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'linksy_contact_type'
      AND e.enumlabel = 'provider_admin'
  ) THEN
    ALTER TYPE linksy_contact_type ADD VALUE 'provider_admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'linksy_contact_type'
      AND e.enumlabel = 'org_admin'
  ) THEN
    ALTER TYPE linksy_contact_type ADD VALUE 'org_admin';
  END IF;
END $$;
