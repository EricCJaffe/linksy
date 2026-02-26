-- Backfill tenant records for providers that are missing tenant_id
-- Safe to re-run; uses unique tenant slug logic and only fills nulls.

DO $$
DECLARE
  r RECORD;
  new_tenant_id UUID;
  tenant_slug TEXT;
  slug_counter INT;
BEGIN
  FOR r IN
    SELECT id, name, slug
    FROM linksy_providers
    WHERE tenant_id IS NULL
  LOOP
    tenant_slug := r.slug;
    slug_counter := 1;

    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = tenant_slug) LOOP
      tenant_slug := r.slug || '-' || slug_counter;
      slug_counter := slug_counter + 1;
    END LOOP;

    INSERT INTO tenants (name, slug, settings, branding)
    VALUES (
      r.name,
      tenant_slug,
      jsonb_build_object('type', 'provider_organization', 'provider_id', r.id),
      '{}'::jsonb
    )
    RETURNING id INTO new_tenant_id;

    UPDATE linksy_providers
    SET tenant_id = new_tenant_id
    WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill tenant_users for provider contacts
DO $$
DECLARE
  c RECORD;
  tenant_role TEXT;
BEGIN
  FOR c IN
    SELECT pc.user_id, pc.provider_role, p.tenant_id
    FROM linksy_provider_contacts pc
    JOIN linksy_providers p ON p.id = pc.provider_id
    WHERE pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND p.tenant_id IS NOT NULL
  LOOP
    tenant_role := CASE
      WHEN c.provider_role = 'admin' THEN 'admin'
      ELSE 'member'
    END;

    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (c.tenant_id, c.user_id, tenant_role::tenant_role)
    ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
  END LOOP;
END $$;
