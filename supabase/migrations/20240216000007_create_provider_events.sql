-- Create provider events table
CREATE TABLE IF NOT EXISTS public.linksy_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.linksy_providers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- Add RLS policies
ALTER TABLE public.linksy_provider_events ENABLE ROW LEVEL SECURITY;

-- Site admins can do everything
CREATE POLICY "Site admins have full access to events"
  ON public.linksy_provider_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'site_admin'
    )
  );

-- Provider contacts can view their own provider's events
CREATE POLICY "Provider contacts can view their provider events"
  ON public.linksy_provider_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.linksy_provider_contacts
      WHERE linksy_provider_contacts.provider_id = linksy_provider_events.provider_id
      AND linksy_provider_contacts.user_id = auth.uid()
      AND linksy_provider_contacts.status = 'active'
    )
  );

-- Provider admins can create/update their provider's events
CREATE POLICY "Provider admins can manage their provider events"
  ON public.linksy_provider_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.linksy_provider_contacts
      WHERE linksy_provider_contacts.provider_id = linksy_provider_events.provider_id
      AND linksy_provider_contacts.user_id = auth.uid()
      AND linksy_provider_contacts.status = 'active'
      AND linksy_provider_contacts.provider_role = 'admin'
    )
  );

-- Public can view approved public events
CREATE POLICY "Anyone can view approved public events"
  ON public.linksy_provider_events
  FOR SELECT
  TO public
  USING (status = 'approved' AND is_public = true);

-- Create index for common queries
CREATE INDEX idx_provider_events_provider_id ON public.linksy_provider_events(provider_id);
CREATE INDEX idx_provider_events_status ON public.linksy_provider_events(status);
CREATE INDEX idx_provider_events_event_date ON public.linksy_provider_events(event_date);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_linksy_provider_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linksy_provider_events_updated_at
  BEFORE UPDATE ON public.linksy_provider_events
  FOR EACH ROW
  EXECUTE FUNCTION update_linksy_provider_events_updated_at();
