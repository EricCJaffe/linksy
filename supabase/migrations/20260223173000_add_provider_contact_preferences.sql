-- Provider contact preference fields used on Summary page
ALTER TABLE IF EXISTS public.linksy_providers
  ADD COLUMN IF NOT EXISTS contact_method TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS allow_contact_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_follow_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_bulk_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_contact_phone BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_contact_fax BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_contact_mail BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF to_regclass('public.linksy_providers') IS NOT NULL THEN
    ALTER TABLE public.linksy_providers
      DROP CONSTRAINT IF EXISTS linksy_providers_contact_method_check;

    ALTER TABLE public.linksy_providers
      ADD CONSTRAINT linksy_providers_contact_method_check
      CHECK (contact_method IN ('all', 'email', 'phone', 'fax', 'mail'));
  END IF;
END $$;
