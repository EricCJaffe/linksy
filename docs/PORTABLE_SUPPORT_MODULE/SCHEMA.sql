-- =============================================================================
-- PORTABLE SUPPORT TICKET MODULE — Database Schema
-- =============================================================================
-- Instructions:
--   1. Find-and-replace 'linksy_' with your chosen table prefix
--   2. Update foreign key references to match your existing tables:
--      - linksy_providers → your organizations/providers table
--      - linksy_needs → your services/categories table (or remove)
--      - linksy_need_categories → your category parent table (or remove)
--      - tenants → your tenant/org table (or remove for single-tenant)
--      - users → your users table
--      - auth.users → Supabase auth.users
--      - sites → your sites table (or remove)
--   3. Run in Supabase SQL Editor or via MCP execute_sql
--   4. All statements are idempotent (safe to re-run)
--
-- NOTE: ALTER TYPE ... ADD VALUE must run OUTSIDE a transaction in PostgreSQL.
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ticket status enum (customize values to match your domain)
DO $$ BEGIN
  CREATE TYPE linksy_ticket_status AS ENUM (
    'pending',
    'in_process',
    'customer_need_addressed',
    'wrong_organization_referred',
    'outside_of_scope',
    'client_not_eligible',
    'unable_to_assist',
    'client_unresponsive',
    'transferred_another_provider',
    'transferred_pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TICKET NUMBER SEQUENCE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS linksy_ticket_number_seq START WITH 2001;

-- Atomically generate ticket numbers: R-XXXX-YY (prevents race conditions)
CREATE OR REPLACE FUNCTION linksy_next_ticket_number()
RETURNS TEXT
LANGUAGE sql VOLATILE
AS $$
  SELECT 'R-' || nextval('linksy_ticket_number_seq')::text
    || '-' || lpad((floor(random() * 100))::text, 2, '0');
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- REFERRAL TICKETS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID,                                            -- FK to your sites table
  provider_id UUID,                                        -- FK to your providers/orgs table
  need_id UUID,                                            -- FK to your services/needs table
  ticket_number TEXT UNIQUE,
  status linksy_ticket_status NOT NULL DEFAULT 'pending',
  client_user_id UUID,                                     -- FK to auth.users (deprecated, use assigned_to)
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  description_of_need TEXT,
  source TEXT,                                             -- e.g., 'widget', 'dashboard', 'api'
  search_session_id UUID,
  client_perception TEXT,
  follow_up_sent BOOLEAN DEFAULT false,

  -- Test & duplicate detection
  is_test BOOLEAN NOT NULL DEFAULT false,
  duplicate_flag_type TEXT CHECK (duplicate_flag_type IN ('case_a', 'case_b', 'case_c', 'case_d')),

  -- SLA
  sla_due_at TIMESTAMPTZ,
  sla_reminder_sent_at TIMESTAMPTZ,

  -- Custom form data (JSONB for host-specific intake fields)
  custom_data JSONB DEFAULT '{}'::jsonb,

  -- Assignment & forwarding
  assigned_to UUID,                                        -- FK to auth.users
  assigned_at TIMESTAMPTZ,
  reassignment_count INTEGER NOT NULL DEFAULT 0,
  last_reassigned_at TIMESTAMPTZ,
  forwarded_from_provider_id UUID,                         -- FK to providers (tracks original)

  -- Status sub-reason
  status_reason_id UUID,                                   -- FK to linksy_ticket_status_reasons

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_site_id ON linksy_tickets(site_id);
CREATE INDEX IF NOT EXISTS idx_tickets_provider_id ON linksy_tickets(provider_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON linksy_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON linksy_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON linksy_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON linksy_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_is_test ON linksy_tickets(is_test) WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_tickets_duplicate_flag ON linksy_tickets(duplicate_flag_type) WHERE duplicate_flag_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_client_provider_date ON linksy_tickets(client_email, provider_id, created_at DESC) WHERE client_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_custom_data ON linksy_tickets USING GIN (custom_data);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_tickets_updated_at ON linksy_tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON linksy_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE linksy_tickets ENABLE ROW LEVEL SECURITY;

-- NOTE: Customize these policies to match your auth model.
-- These are examples — adapt is_site_admin(), provider contact checks, etc.


-- ═══════════════════════════════════════════════════════════════════════════════
-- TICKET COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  author_id UUID,                                          -- FK to auth.users
  author_name TEXT,
  author_role TEXT,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON linksy_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created ON linksy_ticket_comments(created_at);

ALTER TABLE linksy_ticket_comments ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TICKET EVENTS (Immutable Audit Trail)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'assigned', 'reassigned', 'forwarded', 'status_changed', 'comment_added', 'updated'
  )),
  actor_id UUID,                                           -- FK to auth.users
  actor_type TEXT CHECK (actor_type IN ('site_admin', 'provider_admin', 'provider_contact', 'system')),
  previous_state JSONB,
  new_state JSONB,
  reason TEXT CHECK (reason IN (
    'unable_to_assist', 'wrong_org', 'capacity', 'other', 'admin_reassignment', 'internal_assignment'
  )),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON linksy_ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_events_type ON linksy_ticket_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ticket_events_created ON linksy_ticket_events(created_at DESC);

ALTER TABLE linksy_ticket_events ENABLE ROW LEVEL SECURITY;

-- RPC to record events (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION linksy_record_ticket_event(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO linksy_ticket_events (
    ticket_id, event_type, actor_id, actor_type,
    previous_state, new_state, reason, notes, metadata
  )
  VALUES (
    p_ticket_id, p_event_type, p_actor_id, p_actor_type,
    p_previous_state, p_new_state, p_reason, p_notes, p_metadata
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SLA TRIGGER (auto-set sla_due_at on ticket creation)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION linksy_set_sla_due_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := NEW.created_at + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_sla_due_at ON linksy_tickets;
CREATE TRIGGER trg_set_sla_due_at
  BEFORE INSERT ON linksy_tickets
  FOR EACH ROW EXECUTE FUNCTION linksy_set_sla_due_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPPORT TICKETS (Internal — Provider → Staff)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT CHECK (category IN ('technical', 'account', 'billing', 'feature_request', 'other')),
  submitter_id UUID,                                       -- FK to auth.users
  submitter_name TEXT,
  submitter_email TEXT,
  provider_id UUID,                                        -- FK to providers
  assigned_to UUID,                                        -- FK to auth.users (staff)
  resolved_at TIMESTAMPTZ,

  -- AI Triage
  ai_triage JSONB,
  ai_triage_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ai_triage_status IN ('pending', 'analyzing', 'complete', 'failed', 'skipped')),

  -- AI Remediation
  remediation_status TEXT NOT NULL DEFAULT 'none'
    CHECK (remediation_status IN ('none', 'approved', 'generating', 'pr_created', 'merged', 'failed')),
  remediation_pr_url TEXT,
  remediation_branch TEXT,
  remediation_result JSONB,
  remediation_approved_by UUID,                            -- FK to auth.users
  remediation_approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON linksy_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_provider ON linksy_support_tickets(provider_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_submitter ON linksy_support_tickets(submitter_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_triage_status ON linksy_support_tickets(ai_triage_status)
  WHERE ai_triage_status IN ('pending', 'analyzing');

DROP TRIGGER IF EXISTS support_tickets_updated_at ON linksy_support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON linksy_support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS disabled for support tickets (auth at API layer)
-- If you prefer RLS, add policies here instead.


-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPPORT TICKET COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES linksy_support_tickets(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_comments_ticket ON linksy_support_ticket_comments(ticket_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TICKET STATUS REASONS (Admin-configurable sub-statuses)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_ticket_status_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,                                          -- FK to tenants (remove for single-tenant)
  parent_status TEXT NOT NULL,                             -- e.g., 'unable_to_assist'
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_reasons_tenant_status
  ON linksy_ticket_status_reasons(tenant_id, parent_status);

-- Add FK from tickets to status reasons
ALTER TABLE linksy_tickets
  ADD CONSTRAINT fk_tickets_status_reason
  FOREIGN KEY (status_reason_id) REFERENCES linksy_ticket_status_reasons(id) ON DELETE SET NULL;

ALTER TABLE linksy_ticket_status_reasons ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════════
-- REFERRAL ALERT CONFIG (SLA + stale referral alerts)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS linksy_referral_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL UNIQUE,                            -- FK to sites
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  threshold_hours INTEGER NOT NULL DEFAULT 48,
  notify_emails TEXT[] NOT NULL DEFAULT '{}',
  notify_site_admins BOOLEAN NOT NULL DEFAULT true,
  sla_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE linksy_referral_alert_config ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED: Default Status Reasons
-- ═══════════════════════════════════════════════════════════════════════════════

-- Uncomment and adapt for your tenant structure:
-- INSERT INTO linksy_ticket_status_reasons (tenant_id, parent_status, label, sort_order)
-- SELECT t.id, 'unable_to_assist', r.label, r.sort_order
-- FROM your_tenants_table t
-- CROSS JOIN (VALUES
--   ('Out of Funds', 1),
--   ('Minimal Staff Support', 2),
--   ('Waiting List (Full)', 3),
--   ('Out of Materials', 4),
--   ('Unable to Refer', 5),
--   ('Wrong Zip Code', 6),
--   ('Other', 7)
-- ) AS r(label, sort_order)
-- WHERE NOT EXISTS (SELECT 1 FROM linksy_ticket_status_reasons LIMIT 1);


-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER: update_updated_at_column (if not already in your DB)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
