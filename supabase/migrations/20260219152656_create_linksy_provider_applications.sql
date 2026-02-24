
CREATE TABLE linksy_provider_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL,
  sector TEXT,
  description TEXT,
  services TEXT,
  website TEXT,
  phone TEXT,
  hours TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_provider_id UUID REFERENCES linksy_providers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_provider_applications_status ON linksy_provider_applications(status);
CREATE INDEX idx_provider_applications_created ON linksy_provider_applications(created_at DESC);

ALTER TABLE linksy_provider_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit applications"
  ON linksy_provider_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Site admins can view all applications"
  ON linksy_provider_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

CREATE POLICY "Site admins can update applications"
  ON linksy_provider_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;
