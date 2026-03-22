-- Fix linksy_email_templates schema
-- The table was created by 20260219 with (slug, subject, body_html) columns.
-- Migration 20260223 tried to create it with (template_key, subject_template, html_template)
-- but used IF NOT EXISTS, so the schema was never updated.
-- This migration transforms the table to the canonical schema.

-- Step 1: Add new columns if they don't exist
ALTER TABLE linksy_email_templates
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS subject_template TEXT,
  ADD COLUMN IF NOT EXISTS html_template TEXT,
  ADD COLUMN IF NOT EXISTS text_template TEXT,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Step 2: Migrate data from old columns to new columns (if old columns exist)
DO $$
BEGIN
  -- Copy slug -> template_key where template_key is null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linksy_email_templates' AND column_name = 'slug'
  ) THEN
    UPDATE linksy_email_templates
    SET template_key = slug
    WHERE template_key IS NULL;
  END IF;

  -- Copy subject -> subject_template where subject_template is null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linksy_email_templates' AND column_name = 'subject'
  ) THEN
    UPDATE linksy_email_templates
    SET subject_template = subject
    WHERE subject_template IS NULL;
  END IF;

  -- Copy body_html -> html_template where html_template is null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linksy_email_templates' AND column_name = 'body_html'
  ) THEN
    UPDATE linksy_email_templates
    SET html_template = body_html
    WHERE html_template IS NULL;
  END IF;
END $$;

-- Step 3: Make template_key NOT NULL and add unique constraint
ALTER TABLE linksy_email_templates ALTER COLUMN template_key SET NOT NULL;

-- Add unique constraint if it doesn't exist (slug already had one, template_key needs one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'linksy_email_templates_template_key_key'
  ) THEN
    ALTER TABLE linksy_email_templates ADD CONSTRAINT linksy_email_templates_template_key_key UNIQUE (template_key);
  END IF;
END $$;

-- Step 4: Make subject_template and html_template NOT NULL
ALTER TABLE linksy_email_templates ALTER COLUMN subject_template SET NOT NULL;
ALTER TABLE linksy_email_templates ALTER COLUMN html_template SET NOT NULL;

-- Step 5: Drop old columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linksy_email_templates' AND column_name = 'slug'
  ) THEN
    -- Drop the old unique constraint on slug first
    ALTER TABLE linksy_email_templates DROP CONSTRAINT IF EXISTS linksy_email_templates_slug_key;
    ALTER TABLE linksy_email_templates DROP COLUMN slug;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linksy_email_templates' AND column_name = 'subject'
  ) THEN
    ALTER TABLE linksy_email_templates DROP COLUMN subject;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linksy_email_templates' AND column_name = 'body_html'
  ) THEN
    ALTER TABLE linksy_email_templates DROP COLUMN body_html;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linksy_email_templates' AND column_name = 'variables'
  ) THEN
    ALTER TABLE linksy_email_templates DROP COLUMN variables;
  END IF;
END $$;

-- Step 6: Recreate the index and trigger that remote_schema dropped
CREATE INDEX IF NOT EXISTS idx_linksy_email_templates_active
  ON linksy_email_templates(is_active);

CREATE OR REPLACE FUNCTION linksy_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_linksy_email_templates_updated_at ON linksy_email_templates;
CREATE TRIGGER update_linksy_email_templates_updated_at
  BEFORE UPDATE ON linksy_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION linksy_set_updated_at();
