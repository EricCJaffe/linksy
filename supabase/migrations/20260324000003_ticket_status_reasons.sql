-- Add configurable sub-status reasons for ticket statuses (e.g. "Unable to Assist" → "Out of funds")
-- TASK: ticket-status-reasons

-- Table for admin-configurable status reasons
CREATE TABLE IF NOT EXISTS linksy_ticket_status_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_status TEXT NOT NULL, -- e.g. 'unable_to_assist'
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by tenant + parent_status
CREATE INDEX idx_ticket_status_reasons_tenant_status
  ON linksy_ticket_status_reasons(tenant_id, parent_status);

-- Add status_reason_id to tickets
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS status_reason_id UUID REFERENCES linksy_ticket_status_reasons(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE linksy_ticket_status_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view status reasons"
  ON linksy_ticket_status_reasons FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage status reasons"
  ON linksy_ticket_status_reasons FOR ALL
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      JOIN users u ON u.id = tu.user_id
      WHERE tu.user_id = auth.uid() AND (tu.role = 'admin' OR u.role = 'site_admin')
    )
  );

-- Seed default reasons for all existing tenants
INSERT INTO linksy_ticket_status_reasons (tenant_id, parent_status, label, sort_order)
SELECT t.id, 'unable_to_assist', r.label, r.sort_order
FROM tenants t
CROSS JOIN (VALUES
  ('Out of Funds', 1),
  ('Minimal Staff Support', 2),
  ('Waiting List (Full)', 3),
  ('Out of Materials', 4),
  ('Unable to Refer', 5),
  ('Wrong Zip Code', 6),
  ('Other', 7)
) AS r(label, sort_order);
