-- Add created_by_tenant_id to linksy_provider_notes for org-scoped private note visibility
-- Private notes should only be visible to the creating organization + site admins

ALTER TABLE linksy_provider_notes
ADD COLUMN IF NOT EXISTS created_by_tenant_id UUID REFERENCES tenants(id);

-- Index for filtering notes by tenant
CREATE INDEX IF NOT EXISTS idx_provider_notes_tenant_id
ON linksy_provider_notes(created_by_tenant_id)
WHERE created_by_tenant_id IS NOT NULL;

COMMENT ON COLUMN linksy_provider_notes.created_by_tenant_id IS 'Tenant ID of the organization that created this note. Used for org-scoped private note visibility.';
