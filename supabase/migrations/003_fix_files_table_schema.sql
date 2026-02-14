-- Fix files table schema to match application code
-- Add missing columns and rename existing ones

-- Add new columns
ALTER TABLE files
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS module_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS folder_path TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrate data from old columns to new ones (if any data exists)
UPDATE files
SET storage_path = path,
    uploaded_by = user_id
WHERE storage_path IS NULL OR uploaded_by IS NULL;

-- Make storage_path NOT NULL after data migration
ALTER TABLE files ALTER COLUMN storage_path SET NOT NULL;

-- Drop old path column (keep user_id for backward compatibility)
ALTER TABLE files DROP COLUMN IF EXISTS path;

-- Add index for module_id for better query performance
CREATE INDEX IF NOT EXISTS idx_files_module_id ON files(module_id);
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_is_shared ON files(is_shared);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER files_updated_at_trigger
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_files_updated_at();

-- Add RLS policies for files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Users can view files from their tenant
CREATE POLICY "Users can view files from their tenant"
    ON files FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
        )
    );

-- Users can upload files to their tenant
CREATE POLICY "Users can upload files to their tenant"
    ON files FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

-- Users can update their own files or admins can update any files in their tenant
CREATE POLICY "Users can update their own files or admins can update tenant files"
    ON files FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
        )
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM tenant_users
                WHERE user_id = auth.uid()
                AND tenant_id = files.tenant_id
                AND role = 'admin'
            )
        )
    );

-- Users can delete their own files or admins can delete any files in their tenant
CREATE POLICY "Users can delete their own files or admins can delete tenant files"
    ON files FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
        )
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM tenant_users
                WHERE user_id = auth.uid()
                AND tenant_id = files.tenant_id
                AND role = 'admin'
            )
        )
    );
