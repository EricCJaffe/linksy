-- Create sites table for multi-site / Linksy domain isolation
-- Required by Linksy tables that reference sites(id)

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure updated_at stays current
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_sites_updated_at'
  ) THEN
    CREATE TRIGGER update_sites_updated_at
      BEFORE UPDATE ON sites
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed primary site used across Linksy defaults
INSERT INTO sites (id, name, slug, is_active)
VALUES ('86bd8d01-0dc5-4479-beff-666712654104', 'Primary', 'primary', true)
ON CONFLICT (id) DO NOTHING;
