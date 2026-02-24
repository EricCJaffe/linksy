
CREATE TABLE IF NOT EXISTS linksy_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES linksy_providers(id) ON DELETE SET NULL,
  caller_name text,
  call_type text NOT NULL DEFAULT 'outbound' CHECK (call_type IN ('inbound', 'outbound')),
  duration_minutes integer,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by ticket
CREATE INDEX IF NOT EXISTS idx_call_logs_ticket_id ON linksy_call_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_provider_id ON linksy_call_logs(provider_id);

-- Enable RLS
ALTER TABLE linksy_call_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write
CREATE POLICY "Authenticated users can manage call logs" ON linksy_call_logs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
;
