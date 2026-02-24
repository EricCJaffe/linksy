
-- ============================================================================
-- TICKETS
-- ============================================================================
CREATE TABLE linksy_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id),
  need_id UUID REFERENCES linksy_needs(id),
  ticket_number TEXT NOT NULL,
  status linksy_ticket_status DEFAULT 'pending',
  client_user_id UUID REFERENCES auth.users(id),
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  description_of_need TEXT,
  client_perception linksy_ticket_status,
  follow_up_sent BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'manual',
  search_session_id UUID,
  legacy_id TEXT,
  legacy_referral_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_tickets_site ON linksy_tickets(site_id);
CREATE INDEX idx_linksy_tickets_provider ON linksy_tickets(provider_id);
CREATE INDEX idx_linksy_tickets_client ON linksy_tickets(client_user_id);
CREATE INDEX idx_linksy_tickets_status ON linksy_tickets(status);
CREATE INDEX idx_linksy_tickets_number ON linksy_tickets(ticket_number);
CREATE INDEX idx_linksy_tickets_created ON linksy_tickets(created_at DESC);
ALTER TABLE linksy_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_provider_read" ON linksy_tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_tickets.provider_id AND pc.user_id = auth.uid()));
CREATE POLICY "tickets_admin_all" ON linksy_tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- TICKET COMMENTS
-- ============================================================================
CREATE TABLE linksy_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_ticket_comments_ticket ON linksy_ticket_comments(ticket_id);
CREATE INDEX idx_linksy_ticket_comments_created ON linksy_ticket_comments(created_at);
ALTER TABLE linksy_ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_comments_read" ON linksy_ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM linksy_tickets t
      LEFT JOIN linksy_provider_contacts pc ON pc.provider_id = t.provider_id AND pc.user_id = auth.uid()
      LEFT JOIN users u ON u.id = auth.uid()
      WHERE t.id = linksy_ticket_comments.ticket_id
        AND (
          u.role = 'site_admin'
          OR (pc.id IS NOT NULL AND linksy_ticket_comments.is_private = false)
          OR (t.client_user_id = auth.uid() AND linksy_ticket_comments.is_private = false)
        )
    )
  );
CREATE POLICY "ticket_comments_insert" ON linksy_ticket_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linksy_tickets t
      LEFT JOIN linksy_provider_contacts pc ON pc.provider_id = t.provider_id AND pc.user_id = auth.uid()
      LEFT JOIN users u ON u.id = auth.uid()
      WHERE t.id = linksy_ticket_comments.ticket_id
        AND (u.role = 'site_admin' OR pc.id IS NOT NULL OR t.client_user_id = auth.uid())
    )
  );

-- ============================================================================
-- EVENTS
-- ============================================================================
CREATE TABLE linksy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_number TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  location_name TEXT,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  need_category_id UUID REFERENCES linksy_need_categories(id),
  tags TEXT[],
  status linksy_event_status DEFAULT 'draft',
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  registration_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_events_site ON linksy_events(site_id);
CREATE INDEX idx_linksy_events_provider ON linksy_events(provider_id);
CREATE INDEX idx_linksy_events_dates ON linksy_events(start_date, end_date);
CREATE INDEX idx_linksy_events_status ON linksy_events(status);
CREATE INDEX idx_linksy_events_geo ON linksy_events USING GIST (location);
ALTER TABLE linksy_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read" ON linksy_events FOR SELECT USING (status = 'published');
CREATE POLICY "events_provider_manage" ON linksy_events FOR ALL
  USING (EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_events.provider_id AND pc.user_id = auth.uid()));
CREATE POLICY "events_admin_all" ON linksy_events FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;
