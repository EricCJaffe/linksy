-- ============================================================================
-- LINK PROVIDERS TO TENANTS - ONE TENANT PER PROVIDER
-- ============================================================================
-- This migration creates a tenant for each provider organization and links
-- all provider contacts to their provider's tenant. This simplifies the
-- architecture and fixes loading issues for provider users.
-- ============================================================================

-- Step 1: Add tenant_id to linksy_providers table
ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_providers_tenant_id ON linksy_providers(tenant_id);

-- Step 2: Create a tenant for each existing provider and link them
DO $$
DECLARE
  provider_record RECORD;
  new_tenant_id UUID;
  tenant_slug TEXT;
  slug_counter INTEGER;
BEGIN
  FOR provider_record IN
    SELECT id, name, slug
    FROM linksy_providers
    WHERE tenant_id IS NULL
  LOOP
    -- Generate unique tenant slug (provider slug might conflict with existing tenants)
    tenant_slug := provider_record.slug;
    slug_counter := 1;

    -- Check if slug exists and make it unique
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = tenant_slug) LOOP
      tenant_slug := provider_record.slug || '-' || slug_counter;
      slug_counter := slug_counter + 1;
    END LOOP;

    -- Create tenant for this provider
    INSERT INTO tenants (name, slug, settings, branding)
    VALUES (
      provider_record.name,
      tenant_slug,
      jsonb_build_object(
        'type', 'provider_organization',
        'provider_id', provider_record.id
      ),
      '{}'::jsonb
    )
    RETURNING id INTO new_tenant_id;

    -- Link provider to tenant
    UPDATE linksy_providers
    SET tenant_id = new_tenant_id
    WHERE id = provider_record.id;

    RAISE NOTICE 'Created tenant % for provider %', new_tenant_id, provider_record.name;
  END LOOP;
END $$;

-- Step 3: Create tenant_users memberships for all existing provider contacts
DO $$
DECLARE
  contact_record RECORD;
  provider_tenant_id UUID;
  tenant_role TEXT;
BEGIN
  FOR contact_record IN
    SELECT
      pc.id,
      pc.user_id,
      pc.provider_id,
      pc.provider_role,
      pc.status,
      p.tenant_id,
      p.name as provider_name
    FROM linksy_provider_contacts pc
    JOIN linksy_providers p ON p.id = pc.provider_id
    WHERE pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND p.tenant_id IS NOT NULL
  LOOP
    -- Map provider_role to tenant_role
    tenant_role := CASE
      WHEN contact_record.provider_role = 'admin' THEN 'admin'
      ELSE 'member'
    END;

    -- Create tenant_users membership if it doesn't exist
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (
      contact_record.tenant_id,
      contact_record.user_id,
      tenant_role::tenant_role
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RAISE NOTICE 'Created tenant membership for user % in provider % (tenant %)',
      contact_record.user_id, contact_record.provider_name, contact_record.tenant_id;
  END LOOP;
END $$;

-- Step 4: Update the contact linking trigger to also create tenant membership
CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_tenant_id UUID;
  v_user_email TEXT;
  v_provider_role TEXT;
  v_tenant_role TEXT;
BEGIN
  -- Get the user's email
  v_user_email := NEW.email;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Get provider_id, tenant_id, and provider_role from contact
    SELECT provider_id, provider_role
    INTO v_provider_id, v_provider_role
    FROM linksy_provider_contacts
    WHERE id = v_contact_id;

    -- Get tenant_id from provider
    SELECT tenant_id INTO v_tenant_id
    FROM linksy_providers
    WHERE id = v_provider_id;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,
      full_name = NULL
    WHERE id = v_contact_id
      AND user_id IS NULL;

    -- Create tenant membership if provider has a tenant
    IF v_tenant_id IS NOT NULL THEN
      v_tenant_role := CASE
        WHEN v_provider_role = 'admin' THEN 'admin'
        ELSE 'member'
      END;

      INSERT INTO tenant_users (tenant_id, user_id, role)
      VALUES (v_tenant_id, NEW.id, v_tenant_role::tenant_role)
      ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
    END IF;

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    SELECT id, provider_id, provider_role
    INTO v_contact_id, v_provider_id, v_provider_role
    FROM linksy_provider_contacts
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status IN ('invited', 'pending')
    LIMIT 1;

    IF v_contact_id IS NOT NULL THEN
      -- Get tenant_id from provider
      SELECT tenant_id INTO v_tenant_id
      FROM linksy_providers
      WHERE id = v_provider_id;

      -- Update contact
      UPDATE linksy_provider_contacts
      SET
        user_id = NEW.id,
        invitation_accepted_at = NOW(),
        status = 'active',
        email = NULL,
        full_name = NULL
      WHERE id = v_contact_id;

      -- Create tenant membership if provider has a tenant
      IF v_tenant_id IS NOT NULL THEN
        v_tenant_role := CASE
          WHEN v_provider_role = 'admin' THEN 'admin'
          ELSE 'member'
        END;

        INSERT INTO tenant_users (tenant_id, user_id, role)
        VALUES (v_tenant_id, NEW.id, v_tenant_role::tenant_role)
        ON CONFLICT (tenant_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record AND creates tenant membership when they sign up.';

COMMENT ON COLUMN linksy_providers.tenant_id IS 'Each provider organization has its own tenant for workspace management';
