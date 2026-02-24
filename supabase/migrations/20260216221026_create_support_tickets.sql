-- Create support_tickets table for provider support requests
CREATE TABLE IF NOT EXISTS public.linksy_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT CHECK (category IN ('technical', 'account', 'billing', 'feature_request', 'other')),
  submitter_id UUID REFERENCES auth.users(id),
  submitter_name TEXT,
  submitter_email TEXT,
  provider_id UUID REFERENCES public.linksy_providers(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Create support_ticket_comments table
CREATE TABLE IF NOT EXISTS public.linksy_support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.linksy_support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.linksy_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_provider ON public.linksy_support_tickets(provider_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_submitter ON public.linksy_support_tickets(submitter_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket ON public.linksy_support_ticket_comments(ticket_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.linksy_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- Disable RLS for now (will add proper policies later)
ALTER TABLE public.linksy_support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.linksy_support_ticket_comments DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.linksy_support_tickets IS 'Support tickets submitted by providers to Linksy staff';
COMMENT ON TABLE public.linksy_support_ticket_comments IS 'Comments on support tickets';;
