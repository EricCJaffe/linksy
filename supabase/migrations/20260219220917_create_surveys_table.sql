
CREATE TABLE IF NOT EXISTS linksy_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES linksy_tickets(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  client_email text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_ticket_id ON linksy_surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_surveys_token ON linksy_surveys(token);

-- Enable RLS
ALTER TABLE linksy_surveys ENABLE ROW LEVEL SECURITY;

-- Public access for survey submission (token-based)
CREATE POLICY "Anyone can read surveys by token" ON linksy_surveys
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update surveys by token" ON linksy_surveys
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage surveys" ON linksy_surveys
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read surveys" ON linksy_surveys
  FOR SELECT USING (auth.role() = 'authenticated');
;
