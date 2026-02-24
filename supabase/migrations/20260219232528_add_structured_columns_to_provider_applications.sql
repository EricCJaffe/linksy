
ALTER TABLE linksy_provider_applications
  ADD COLUMN IF NOT EXISTS locations JSONB,
  ADD COLUMN IF NOT EXISTS selected_needs JSONB,
  ADD COLUMN IF NOT EXISTS contact_job_title TEXT,
  ADD COLUMN IF NOT EXISTS referral_type TEXT,
  ADD COLUMN IF NOT EXISTS referral_instructions TEXT;

COMMENT ON COLUMN linksy_provider_applications.locations IS 'Array of location objects from multi-step form';
COMMENT ON COLUMN linksy_provider_applications.selected_needs IS 'Array of need UUIDs selected by applicant';
COMMENT ON COLUMN linksy_provider_applications.contact_job_title IS 'Job title of primary contact';
COMMENT ON COLUMN linksy_provider_applications.referral_type IS 'standard or contact_directly';
COMMENT ON COLUMN linksy_provider_applications.referral_instructions IS 'Instructions when referral_type is contact_directly';
;
