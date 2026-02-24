-- Migration: Create Ticket Reassignment System
-- Creates event table for audit trail + extends tickets table with assignment fields

-- ================================================================
-- 1. Create linksy_ticket_events table for comprehensive audit trail
-- ================================================================

CREATE TABLE IF NOT EXISTS linksy_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'assigned',
    'reassigned',
    'forwarded',
    'status_changed',
    'comment_added',
    'updated'
  )),

  -- Actor tracking
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type TEXT CHECK (actor_type IN ('site_admin', 'provider_admin', 'provider_contact', 'system')),

  -- State changes
  previous_state JSONB,
  new_state JSONB,

  -- Context
  reason TEXT CHECK (reason IS NULL OR reason IN (
    'unable_to_assist',
    'wrong_org',
    'capacity',
    'other',
    'admin_reassignment',
    'internal_assignment'
  )),
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ticket_events_ticket_id ON linksy_ticket_events(ticket_id);
CREATE INDEX idx_ticket_events_event_type ON linksy_ticket_events(event_type);
CREATE INDEX idx_ticket_events_created_at ON linksy_ticket_events(created_at DESC);
CREATE INDEX idx_ticket_events_actor_id ON linksy_ticket_events(actor_id);

COMMENT ON TABLE linksy_ticket_events IS 'Immutable audit trail for all ticket lifecycle events';
COMMENT ON COLUMN linksy_ticket_events.event_type IS 'Type of event: created, assigned, reassigned, forwarded, status_changed, comment_added, updated';
COMMENT ON COLUMN linksy_ticket_events.actor_id IS 'User who performed the action (null for system actions)';
COMMENT ON COLUMN linksy_ticket_events.actor_type IS 'Role of actor: site_admin, provider_admin, provider_contact, system';
COMMENT ON COLUMN linksy_ticket_events.previous_state IS 'JSON snapshot of relevant fields before change';
COMMENT ON COLUMN linksy_ticket_events.new_state IS 'JSON snapshot of relevant fields after change';
COMMENT ON COLUMN linksy_ticket_events.reason IS 'Categorized reason for action (for reassignments/forwards)';
COMMENT ON COLUMN linksy_ticket_events.notes IS 'Freeform explanation from actor';

-- ================================================================
-- 2. Extend linksy_tickets table with assignment fields
-- ================================================================

-- Add new assignment tracking fields
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reassignment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reassigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forwarded_from_provider_id UUID REFERENCES linksy_providers(id) ON DELETE SET NULL;

-- Indexes for assignment queries
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON linksy_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_reassignment_count ON linksy_tickets(reassignment_count);
CREATE INDEX IF NOT EXISTS idx_tickets_forwarded_from ON linksy_tickets(forwarded_from_provider_id);

COMMENT ON COLUMN linksy_tickets.assigned_to IS 'Current assignee (replaces overloaded client_user_id)';
COMMENT ON COLUMN linksy_tickets.assigned_at IS 'Timestamp of current assignment';
COMMENT ON COLUMN linksy_tickets.reassignment_count IS 'Number of times ticket reassigned between providers (not internal)';
COMMENT ON COLUMN linksy_tickets.last_reassigned_at IS 'Timestamp of most recent reassignment';
COMMENT ON COLUMN linksy_tickets.forwarded_from_provider_id IS 'Original provider when forwarded to admin pool';

-- ================================================================
-- 3. Backfill assigned_to from existing client_user_id
-- ================================================================

UPDATE linksy_tickets
SET
  assigned_to = client_user_id,
  assigned_at = created_at
WHERE client_user_id IS NOT NULL
  AND assigned_to IS NULL;

-- ================================================================
-- 4. Create initial "created" events for existing tickets
-- ================================================================

INSERT INTO linksy_ticket_events (
  ticket_id,
  event_type,
  actor_type,
  new_state,
  created_at
)
SELECT
  t.id,
  'created'::text,
  'system'::text,
  jsonb_build_object(
    'provider_id', t.provider_id,
    'assigned_to', t.assigned_to,
    'status', t.status,
    'priority', t.priority
  ),
  t.created_at
FROM linksy_tickets t
WHERE NOT EXISTS (
  SELECT 1 FROM linksy_ticket_events e
  WHERE e.ticket_id = t.id AND e.event_type = 'created'
);

-- ================================================================
-- 5. RLS Policies for linksy_ticket_events
-- ================================================================

ALTER TABLE linksy_ticket_events ENABLE ROW LEVEL SECURITY;

-- Site admins can see all events
CREATE POLICY "Site admins can view all ticket events"
  ON linksy_ticket_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.is_site_admin = true
    )
  );

-- Provider contacts can see events for their tickets
CREATE POLICY "Provider contacts can view their ticket events"
  ON linksy_ticket_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM linksy_tickets t
      JOIN linksy_provider_contacts pc ON pc.provider_id = t.provider_id
      WHERE t.id = ticket_id
        AND pc.user_id = auth.uid()
    )
  );

-- Only system can insert events (enforced at application layer)
CREATE POLICY "Service role can insert events"
  ON linksy_ticket_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- No updates allowed (append-only audit trail)
-- No DELETE policy (immutable)

-- ================================================================
-- 6. Helper function to record ticket events
-- ================================================================

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
  v_event_id UUID;
BEGIN
  INSERT INTO linksy_ticket_events (
    ticket_id,
    event_type,
    actor_id,
    actor_type,
    previous_state,
    new_state,
    reason,
    notes,
    metadata
  ) VALUES (
    p_ticket_id,
    p_event_type,
    p_actor_id,
    p_actor_type,
    p_previous_state,
    p_new_state,
    p_reason,
    p_notes,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION linksy_record_ticket_event IS 'Helper function to record ticket events with full context';

-- ================================================================
-- 7. Trigger to auto-create event on ticket status change
-- ================================================================

CREATE OR REPLACE FUNCTION linksy_ticket_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only record if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM linksy_record_ticket_event(
      p_ticket_id := NEW.id,
      p_event_type := 'status_changed',
      p_actor_type := 'system',
      p_previous_state := jsonb_build_object('status', OLD.status),
      p_new_state := jsonb_build_object('status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (only if not exists)
DROP TRIGGER IF EXISTS ticket_status_change_trigger ON linksy_tickets;
CREATE TRIGGER ticket_status_change_trigger
  AFTER UPDATE ON linksy_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION linksy_ticket_status_change_trigger();

COMMENT ON TRIGGER ticket_status_change_trigger ON linksy_tickets IS 'Auto-creates event when ticket status changes';
