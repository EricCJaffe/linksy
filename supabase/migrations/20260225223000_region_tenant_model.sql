-- Region tenant model: create region tenants and assign all providers to Impact Clay

DO $$
DECLARE
  impact_tenant_id UUID;
  united_tenant_id UUID;
BEGIN
  -- Create Impact Clay tenant if missing
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
  ELSE
    UPDATE tenants
    SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('type', 'region')
    WHERE id = impact_tenant_id;
  END IF;

  -- Create United Way of North Florida tenant if missing (unassigned for now)
  SELECT id INTO united_tenant_id
  FROM tenants
  WHERE slug = 'united-way-of-north-florida'
  LIMIT 1;

  IF united_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, settings, branding)
    VALUES (
      'United Way of North Florida',
      'united-way-of-north-florida',
      jsonb_build_object('type', 'region'),
      '{}'::jsonb
    )
    RETURNING id INTO united_tenant_id;
  ELSE
    UPDATE tenants
    SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('type', 'region')
    WHERE id = united_tenant_id;
  END IF;

  -- Assign all providers to Impact Clay
  UPDATE linksy_providers
  SET tenant_id = impact_tenant_id;

  -- Point webhooks to Impact Clay
  UPDATE linksy_webhooks
  SET tenant_id = impact_tenant_id;

  -- Ensure site admins are tenant admins for Impact Clay
  INSERT INTO tenant_users (tenant_id, user_id, role)
  SELECT impact_tenant_id, u.id, 'admin'::tenant_role
  FROM users u
  WHERE u.role = 'site_admin'
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;
END $$;
