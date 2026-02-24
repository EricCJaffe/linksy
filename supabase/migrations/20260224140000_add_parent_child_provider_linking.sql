-- Add parent/child organization linking
-- Allows multi-location organizations to link child sites to a parent org

-- Add parent relationship column
ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS parent_provider_id UUID REFERENCES linksy_providers(id) ON DELETE SET NULL;

-- Add audit trail columns
ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS parent_linked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS parent_linked_at TIMESTAMPTZ;

COMMENT ON COLUMN linksy_providers.parent_provider_id IS 'Parent organization (for multi-location orgs). NULL = this is a parent or standalone provider';
COMMENT ON COLUMN linksy_providers.parent_linked_by IS 'User who created the parent-child link';
COMMENT ON COLUMN linksy_providers.parent_linked_at IS 'When the parent-child link was created';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_linksy_providers_parent
ON linksy_providers(parent_provider_id)
WHERE parent_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_providers_is_parent
ON linksy_providers(id)
WHERE parent_provider_id IS NULL;

-- Prevent circular references (provider cannot be its own parent)
ALTER TABLE linksy_providers
ADD CONSTRAINT chk_not_self_parent CHECK (id != parent_provider_id);

-- Create helper function to get all child provider IDs for a parent
CREATE OR REPLACE FUNCTION linksy_get_child_provider_ids(p_parent_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
AS $$
  SELECT ARRAY_AGG(id)
  FROM linksy_providers
  WHERE parent_provider_id = p_parent_id;
$$;

COMMENT ON FUNCTION linksy_get_child_provider_ids IS 'Returns array of child provider IDs for a given parent provider';

-- Create helper function to check if user has access to provider (including via parent relationship)
CREATE OR REPLACE FUNCTION linksy_user_can_access_provider(p_user_id UUID, p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_parent_id UUID;
  v_has_direct_access BOOLEAN;
  v_has_parent_access BOOLEAN;
BEGIN
  -- Check direct access (user is a contact for this provider)
  SELECT EXISTS (
    SELECT 1 FROM linksy_provider_contacts
    WHERE provider_id = p_provider_id
      AND user_id = p_user_id
      AND status = 'active'
  ) INTO v_has_direct_access;

  IF v_has_direct_access THEN
    RETURN TRUE;
  END IF;

  -- Check parent access (user is an admin contact for the parent of this provider)
  SELECT parent_provider_id INTO v_parent_id
  FROM linksy_providers
  WHERE id = p_provider_id;

  IF v_parent_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM linksy_provider_contacts
      WHERE provider_id = v_parent_id
        AND user_id = p_user_id
        AND status = 'active'
        AND contact_type IN ('provider_admin', 'org_admin')
    ) INTO v_has_parent_access;

    RETURN v_has_parent_access;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION linksy_user_can_access_provider IS 'Returns true if user can access provider directly or via parent org admin role';
