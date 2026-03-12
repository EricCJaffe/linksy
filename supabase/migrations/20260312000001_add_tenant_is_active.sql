-- TASK-037: Archive "Impact Clay" tenant (read-only, preserve historical data)
-- Adds is_active flag to tenants table and archives Impact Clay

-- Add is_active column (default true so existing tenants remain active)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Archive "Impact Clay" tenant by slug
UPDATE tenants SET is_active = false WHERE slug = 'impact-clay';
