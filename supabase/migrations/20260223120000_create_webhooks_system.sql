-- Webhooks system for outbound event delivery

CREATE TABLE IF NOT EXISTS linksy_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_delivery_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linksy_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES linksy_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_code INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linksy_webhooks_tenant_id
  ON linksy_webhooks(tenant_id);

CREATE INDEX IF NOT EXISTS idx_linksy_webhooks_is_active
  ON linksy_webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_linksy_webhook_deliveries_webhook_id
  ON linksy_webhook_deliveries(webhook_id);

CREATE INDEX IF NOT EXISTS idx_linksy_webhook_deliveries_created_at
  ON linksy_webhook_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_linksy_webhook_deliveries_success
  ON linksy_webhook_deliveries(success);

DROP TRIGGER IF EXISTS update_linksy_webhooks_updated_at ON linksy_webhooks;
CREATE TRIGGER update_linksy_webhooks_updated_at
  BEFORE UPDATE ON linksy_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE linksy_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE linksy_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tenant webhooks"
  ON linksy_webhooks FOR SELECT
  USING (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can create tenant webhooks"
  ON linksy_webhooks FOR INSERT
  WITH CHECK (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can update tenant webhooks"
  ON linksy_webhooks FOR UPDATE
  USING (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete tenant webhooks"
  ON linksy_webhooks FOR DELETE
  USING (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can view webhook deliveries"
  ON linksy_webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM linksy_webhooks w
      WHERE w.id = webhook_id
      AND (is_site_admin() OR is_tenant_admin(w.tenant_id))
    )
  );

CREATE POLICY "System can create webhook deliveries"
  ON linksy_webhook_deliveries FOR INSERT
  WITH CHECK (true);
