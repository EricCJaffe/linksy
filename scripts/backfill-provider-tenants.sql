-- Assign all providers to the Impact Clay region tenant.
-- Safe to re-run; creates the region tenant if missing and sets tenant_id.

DO $$
DECLARE
  r RECORD;
  impact_tenant_id UUID;
BEGIN
  -- Ensure Impact Clay tenant exists
  SELECT id INTO impact_tenant_id
  FROM tenants
  WHERE slug = 'impact-clay'
  LIMIT 1;

  IF impact_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, settings, branding)
    VALUES (
      'Impact Clay',
      'impact-clay',
      jsonb_build_object('type', 'region'),
      '{}'::jsonb
    )
    RETURNING id INTO impact_tenant_id;
  END IF;

  -- Assign all providers to Impact Clay
  FOR r IN
    SELECT id
    FROM linksy_providers
  LOOP
    UPDATE linksy_providers
    SET tenant_id = impact_tenant_id
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
