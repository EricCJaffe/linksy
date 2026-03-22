-- ============================================================
-- Linksy — Consolidated Schema (all migrations)
-- Generated: 2026-03-22T23:46:03Z
-- Source: supabase/migrations/ (82 files)
-- ============================================================


-- ************************************************************
-- Migration: 001_initial_schema.sql
-- ************************************************************

-- Multi-tenant SaaS Initial Schema
-- This migration creates all the base tables for the multi-tenant application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('site_admin', 'tenant_admin', 'user');
CREATE TYPE tenant_role AS ENUM ('admin', 'member');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Users (many-to-many relationship)
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role tenant_role DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Modules (which modules are enabled for each tenant)
CREATE TABLE IF NOT EXISTS tenant_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, module_id)
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role tenant_role DEFAULT 'member',
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_id ON tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is site admin
CREATE OR REPLACE FUNCTION is_site_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'site_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_id = tenant_uuid
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION belongs_to_tenant(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_id = tenant_uuid
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Site admins can view all tenants"
    ON tenants FOR SELECT
    USING (is_site_admin());

CREATE POLICY "Users can view their own tenants"
    ON tenants FOR SELECT
    USING (belongs_to_tenant(id));

CREATE POLICY "Site admins can create tenants"
    ON tenants FOR INSERT
    WITH CHECK (is_site_admin());

CREATE POLICY "Tenant admins can update their tenant"
    ON tenants FOR UPDATE
    USING (is_site_admin() OR is_tenant_admin(id));

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Site admins can view all users"
    ON users FOR SELECT
    USING (is_site_admin());

CREATE POLICY "Users can view other users in their tenants"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenant_users tu1
            JOIN tenant_users tu2 ON tu1.tenant_id = tu2.tenant_id
            WHERE tu1.user_id = auth.uid()
            AND tu2.user_id = users.id
        )
    );

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "System can insert users"
    ON users FOR INSERT
    WITH CHECK (true);

-- Tenant Users policies
CREATE POLICY "Users can view their own memberships"
    ON tenant_users FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Site admins can view all memberships"
    ON tenant_users FOR SELECT
    USING (is_site_admin());

CREATE POLICY "Tenant admins can view their tenant memberships"
    ON tenant_users FOR SELECT
    USING (is_tenant_admin(tenant_id));

CREATE POLICY "Site admins can manage all memberships"
    ON tenant_users FOR ALL
    USING (is_site_admin());

CREATE POLICY "Tenant admins can manage their tenant memberships"
    ON tenant_users FOR ALL
    USING (is_tenant_admin(tenant_id));

-- Modules policies
CREATE POLICY "Anyone can view active modules"
    ON modules FOR SELECT
    USING (is_active = true);

CREATE POLICY "Site admins can manage modules"
    ON modules FOR ALL
    USING (is_site_admin());

-- Tenant Modules policies
CREATE POLICY "Users can view their tenant modules"
    ON tenant_modules FOR SELECT
    USING (belongs_to_tenant(tenant_id));

CREATE POLICY "Site admins can manage all tenant modules"
    ON tenant_modules FOR ALL
    USING (is_site_admin());

CREATE POLICY "Tenant admins can manage their tenant modules"
    ON tenant_modules FOR ALL
    USING (is_tenant_admin(tenant_id));

-- Invitations policies
CREATE POLICY "Tenant admins can view their invitations"
    ON invitations FOR SELECT
    USING (is_tenant_admin(tenant_id) OR is_site_admin());

CREATE POLICY "Tenant admins can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (is_tenant_admin(tenant_id) OR is_site_admin());

CREATE POLICY "Tenant admins can delete invitations"
    ON invitations FOR DELETE
    USING (is_tenant_admin(tenant_id) OR is_site_admin());

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Audit Logs policies
CREATE POLICY "Site admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (is_site_admin());

CREATE POLICY "Tenant admins can view their tenant audit logs"
    ON audit_logs FOR SELECT
    USING (tenant_id IS NOT NULL AND is_tenant_admin(tenant_id));

CREATE POLICY "System can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- Files policies
CREATE POLICY "Users can view files in their tenants"
    ON files FOR SELECT
    USING (belongs_to_tenant(tenant_id));

CREATE POLICY "Users can upload files to their tenants"
    ON files FOR INSERT
    WITH CHECK (belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete their own files"
    ON files FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can delete any file in their tenant"
    ON files FOR DELETE
    USING (is_tenant_admin(tenant_id));

-- Insert default modules
INSERT INTO modules (name, slug, description, is_active) VALUES
    ('Core', 'core', 'Core functionality including dashboard and settings', true),
    ('User Management', 'users', 'Manage users and invitations', true),
    ('Notifications', 'notifications', 'In-app and email notifications', true),
    ('File Storage', 'files', 'File upload and management', true),
    ('Audit Logs', 'audit', 'Track and view all system activities', true)
ON CONFLICT (slug) DO NOTHING;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();


-- ************************************************************
-- Migration: 003_add_tenant_contact_fields.sql
-- ************************************************************

-- Add contact and address fields to tenants table

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS track_location BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for primary contact lookups
CREATE INDEX IF NOT EXISTS idx_tenants_primary_contact ON tenants(primary_contact_id);

-- Add comment
COMMENT ON COLUMN tenants.track_location IS 'Whether to enable location tracking features for this tenant';
COMMENT ON COLUMN tenants.primary_contact_id IS 'The main contact person for this tenant organization';


-- ************************************************************
-- Migration: 20260216174000_create_sites_table.sql
-- ************************************************************

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


-- ************************************************************
-- Migration: 20260216174315_enable_extensions.sql
-- ************************************************************


-- Enable required extensions for Linksy
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ************************************************************
-- Migration: 20260216174848_linksy_enums_and_taxonomy.sql
-- ************************************************************


-- ============================================================================
-- LINKSY ENUMS
-- ============================================================================
CREATE TYPE linksy_sector AS ENUM ('nonprofit', 'faith_based', 'government', 'business');
CREATE TYPE linksy_project_status AS ENUM ('active', 'sustaining', 'maintenance', 'na');
CREATE TYPE linksy_referral_type AS ENUM ('standard', 'contact_directly');
CREATE TYPE linksy_ticket_status AS ENUM ('pending', 'customer_need_addressed', 'wrong_organization_referred', 'outside_of_scope', 'client_not_eligible', 'unable_to_assist', 'client_unresponsive');
CREATE TYPE linksy_contact_type AS ENUM ('customer', 'provider_employee');
CREATE TYPE linksy_event_status AS ENUM ('draft', 'pending_approval', 'published', 'cancelled');
CREATE TYPE linksy_note_type AS ENUM ('general', 'outreach', 'update', 'internal');

-- ============================================================================
-- NEED CATEGORIES
-- ============================================================================
CREATE TABLE linksy_need_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  airs_code TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);
CREATE INDEX idx_linksy_need_categories_site ON linksy_need_categories(site_id);
ALTER TABLE linksy_need_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "need_categories_public_read" ON linksy_need_categories FOR SELECT USING (is_active = true);
CREATE POLICY "need_categories_admin_write" ON linksy_need_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- NEEDS
-- ============================================================================
CREATE TABLE linksy_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES linksy_need_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  synonyms TEXT[],
  is_active BOOLEAN DEFAULT true,
  embedding vector(1536),
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_generated_at TIMESTAMPTZ,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);
CREATE INDEX idx_linksy_needs_site ON linksy_needs(site_id);
CREATE INDEX idx_linksy_needs_category ON linksy_needs(category_id);
CREATE INDEX idx_linksy_needs_name_trgm ON linksy_needs USING gin (name gin_trgm_ops);
ALTER TABLE linksy_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "needs_public_read" ON linksy_needs FOR SELECT USING (is_active = true);
CREATE POLICY "needs_admin_write" ON linksy_needs FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;


-- ************************************************************
-- Migration: 20260216174904_linksy_providers_and_locations.sql
-- ************************************************************


-- ============================================================================
-- PROVIDERS
-- ============================================================================
CREATE TABLE linksy_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sector linksy_sector NOT NULL DEFAULT 'nonprofit',
  project_status linksy_project_status DEFAULT 'na',
  referral_type linksy_referral_type DEFAULT 'standard',
  referral_instructions TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  hours_of_operation TEXT,
  social_links JSONB DEFAULT '{}',
  llm_context_card TEXT,
  llm_context_card_generated_at TIMESTAMPTZ,
  ai_summary TEXT,
  embedding vector(1536),
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_generated_at TIMESTAMPTZ,
  search_popularity_score FLOAT DEFAULT 0,
  click_through_rate FLOAT DEFAULT 0,
  ticket_conversion_rate FLOAT DEFAULT 0,
  description_quality_score FLOAT,
  needs_human_review BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  allow_auto_update_description BOOLEAN DEFAULT false,
  legacy_id TEXT,
  legacy_referral_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);
CREATE INDEX idx_linksy_providers_site ON linksy_providers(site_id);
CREATE INDEX idx_linksy_providers_active ON linksy_providers(site_id, is_active);
CREATE INDEX idx_linksy_providers_sector ON linksy_providers(sector);
CREATE INDEX idx_linksy_providers_name_trgm ON linksy_providers USING gin (name gin_trgm_ops);
ALTER TABLE linksy_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_public_read" ON linksy_providers FOR SELECT USING (is_active = true);
CREATE POLICY "providers_admin_all" ON linksy_providers FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- LOCATIONS
-- ============================================================================
CREATE TABLE linksy_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_line3 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  county TEXT,
  country TEXT DEFAULT 'US',
  location GEOGRAPHY(POINT, 4326),
  latitude FLOAT,
  longitude FLOAT,
  geocoded_at TIMESTAMPTZ,
  geocode_source TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_locations_provider ON linksy_locations(provider_id);
CREATE INDEX idx_linksy_locations_geo ON linksy_locations USING GIST (location);
CREATE INDEX idx_linksy_locations_city ON linksy_locations(city);
CREATE INDEX idx_linksy_locations_postal ON linksy_locations(postal_code);
ALTER TABLE linksy_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_public_read" ON linksy_locations FOR SELECT USING (is_active = true);
CREATE POLICY "locations_admin_write" ON linksy_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;


-- ************************************************************
-- Migration: 20260216174921_linksy_junctions_contacts_notes.sql
-- ************************************************************


-- ============================================================================
-- PROVIDER ↔ NEEDS (many-to-many)
-- ============================================================================
CREATE TABLE linksy_provider_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  need_id UUID NOT NULL REFERENCES linksy_needs(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'manual',
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, need_id)
);
CREATE INDEX idx_linksy_provider_needs_provider ON linksy_provider_needs(provider_id);
CREATE INDEX idx_linksy_provider_needs_need ON linksy_provider_needs(need_id);
CREATE INDEX idx_linksy_provider_needs_unconfirmed ON linksy_provider_needs(is_confirmed) WHERE is_confirmed = false;
ALTER TABLE linksy_provider_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_needs_public_read" ON linksy_provider_needs FOR SELECT USING (true);
CREATE POLICY "provider_needs_admin_write" ON linksy_provider_needs FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- PROVIDER CONTACTS (links auth users to provider orgs)
-- ============================================================================
CREATE TABLE linksy_provider_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_type linksy_contact_type NOT NULL DEFAULT 'provider_employee',
  is_primary_contact BOOLEAN DEFAULT false,
  job_title TEXT,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, user_id)
);
CREATE INDEX idx_linksy_provider_contacts_provider ON linksy_provider_contacts(provider_id);
CREATE INDEX idx_linksy_provider_contacts_user ON linksy_provider_contacts(user_id);
ALTER TABLE linksy_provider_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_contacts_self_read" ON linksy_provider_contacts FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "provider_contacts_admin_all" ON linksy_provider_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- PROVIDER NOTES / TIMELINE
-- ============================================================================
CREATE TABLE linksy_provider_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  note_type linksy_note_type DEFAULT 'general',
  content TEXT NOT NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_provider_notes_provider ON linksy_provider_notes(provider_id);
CREATE INDEX idx_linksy_provider_notes_created ON linksy_provider_notes(created_at DESC);
ALTER TABLE linksy_provider_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_notes_read" ON linksy_provider_notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin')
    OR EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_provider_notes.provider_id AND pc.user_id = auth.uid())
  );
CREATE POLICY "provider_notes_insert" ON linksy_provider_notes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin')
    OR EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_provider_notes.provider_id AND pc.user_id = auth.uid())
  );
;


-- ************************************************************
-- Migration: 20260216174941_linksy_tickets_comments_events.sql
-- ************************************************************


-- ============================================================================
-- TICKETS
-- ============================================================================
CREATE TABLE linksy_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id),
  need_id UUID REFERENCES linksy_needs(id),
  ticket_number TEXT NOT NULL,
  status linksy_ticket_status DEFAULT 'pending',
  client_user_id UUID REFERENCES auth.users(id),
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  description_of_need TEXT,
  client_perception linksy_ticket_status,
  follow_up_sent BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'manual',
  search_session_id UUID,
  legacy_id TEXT,
  legacy_referral_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_tickets_site ON linksy_tickets(site_id);
CREATE INDEX idx_linksy_tickets_provider ON linksy_tickets(provider_id);
CREATE INDEX idx_linksy_tickets_client ON linksy_tickets(client_user_id);
CREATE INDEX idx_linksy_tickets_status ON linksy_tickets(status);
CREATE INDEX idx_linksy_tickets_number ON linksy_tickets(ticket_number);
CREATE INDEX idx_linksy_tickets_created ON linksy_tickets(created_at DESC);
ALTER TABLE linksy_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_provider_read" ON linksy_tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_tickets.provider_id AND pc.user_id = auth.uid()));
CREATE POLICY "tickets_admin_all" ON linksy_tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- TICKET COMMENTS
-- ============================================================================
CREATE TABLE linksy_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_ticket_comments_ticket ON linksy_ticket_comments(ticket_id);
CREATE INDEX idx_linksy_ticket_comments_created ON linksy_ticket_comments(created_at);
ALTER TABLE linksy_ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_comments_read" ON linksy_ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM linksy_tickets t
      LEFT JOIN linksy_provider_contacts pc ON pc.provider_id = t.provider_id AND pc.user_id = auth.uid()
      LEFT JOIN users u ON u.id = auth.uid()
      WHERE t.id = linksy_ticket_comments.ticket_id
        AND (
          u.role = 'site_admin'
          OR (pc.id IS NOT NULL AND linksy_ticket_comments.is_private = false)
          OR (t.client_user_id = auth.uid() AND linksy_ticket_comments.is_private = false)
        )
    )
  );
CREATE POLICY "ticket_comments_insert" ON linksy_ticket_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linksy_tickets t
      LEFT JOIN linksy_provider_contacts pc ON pc.provider_id = t.provider_id AND pc.user_id = auth.uid()
      LEFT JOIN users u ON u.id = auth.uid()
      WHERE t.id = linksy_ticket_comments.ticket_id
        AND (u.role = 'site_admin' OR pc.id IS NOT NULL OR t.client_user_id = auth.uid())
    )
  );

-- ============================================================================
-- EVENTS
-- ============================================================================
CREATE TABLE linksy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_number TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  location_name TEXT,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  need_category_id UUID REFERENCES linksy_need_categories(id),
  tags TEXT[],
  status linksy_event_status DEFAULT 'draft',
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  registration_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_events_site ON linksy_events(site_id);
CREATE INDEX idx_linksy_events_provider ON linksy_events(provider_id);
CREATE INDEX idx_linksy_events_dates ON linksy_events(start_date, end_date);
CREATE INDEX idx_linksy_events_status ON linksy_events(status);
CREATE INDEX idx_linksy_events_geo ON linksy_events USING GIST (location);
ALTER TABLE linksy_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read" ON linksy_events FOR SELECT USING (status = 'published');
CREATE POLICY "events_provider_manage" ON linksy_events FOR ALL
  USING (EXISTS (SELECT 1 FROM linksy_provider_contacts pc WHERE pc.provider_id = linksy_events.provider_id AND pc.user_id = auth.uid()));
CREATE POLICY "events_admin_all" ON linksy_events FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;


-- ************************************************************
-- Migration: 20260216175006_linksy_ai_analytics_apikeys.sql
-- ************************************************************


-- ============================================================================
-- SEARCH SESSIONS (AI chatbot conversations)
-- ============================================================================
CREATE TABLE linksy_search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  api_key_id UUID,
  user_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  initial_query TEXT,
  zip_code_searched TEXT,
  user_location GEOGRAPHY(POINT, 4326),
  search_radius_miles INTEGER DEFAULT 25,
  conversation_history JSONB,
  inferred_needs TEXT[],
  total_tokens_used INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  model_used TEXT,
  created_ticket BOOLEAN DEFAULT false,
  ticket_id UUID REFERENCES linksy_tickets(id),
  crisis_detected BOOLEAN DEFAULT false,
  crisis_type TEXT,
  services_viewed UUID[],
  services_clicked UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_linksy_sessions_site ON linksy_search_sessions(site_id);
CREATE INDEX idx_linksy_sessions_created ON linksy_search_sessions(created_at DESC);
CREATE INDEX idx_linksy_sessions_crisis ON linksy_search_sessions(crisis_detected) WHERE crisis_detected = true;
ALTER TABLE linksy_search_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_admin_read" ON linksy_search_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
CREATE POLICY "sessions_anon_insert" ON linksy_search_sessions FOR INSERT WITH CHECK (true);

-- ============================================================================
-- CRISIS KEYWORDS
-- ============================================================================
CREATE TABLE linksy_crisis_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  crisis_type TEXT NOT NULL,
  severity TEXT DEFAULT 'high',
  response_template TEXT,
  emergency_resources JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_crisis_site ON linksy_crisis_keywords(site_id, is_active);
CREATE INDEX idx_linksy_crisis_keyword ON linksy_crisis_keywords USING gin (keyword gin_trgm_ops);
ALTER TABLE linksy_crisis_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crisis_admin_manage" ON linksy_crisis_keywords FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- LINKSY API KEYS (widget auth & billing - separate from base api_keys)
-- ============================================================================
CREATE TABLE linksy_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id),
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_status TEXT DEFAULT 'active',
  rate_limit_per_hour INTEGER DEFAULT 100,
  monthly_query_limit INTEGER,
  queries_this_month INTEGER DEFAULT 0,
  allowed_domains TEXT[],
  widget_config JSONB DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_linksy_api_keys_prefix ON linksy_api_keys(key_prefix);
CREATE INDEX idx_linksy_api_keys_site ON linksy_api_keys(site_id);
CREATE INDEX idx_linksy_api_keys_active ON linksy_api_keys(is_active) WHERE is_active = true;
ALTER TABLE linksy_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linksy_api_keys_admin_manage" ON linksy_api_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- AI PROMPTS (versioned prompt management)
-- ============================================================================
CREATE TABLE linksy_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  model_name TEXT DEFAULT 'claude-sonnet-4',
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT false,
  performance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(site_id, prompt_type, version)
);
CREATE INDEX idx_linksy_ai_prompts_active ON linksy_ai_prompts(site_id, prompt_type, is_active) WHERE is_active = true;
ALTER TABLE linksy_ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompts_admin_manage" ON linksy_ai_prompts FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));

-- ============================================================================
-- INTERACTIONS (analytics)
-- ============================================================================
CREATE TABLE linksy_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES linksy_search_sessions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES linksy_providers(id) ON DELETE CASCADE,
  need_id UUID REFERENCES linksy_needs(id),
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_linksy_interactions_session ON linksy_interactions(session_id);
CREATE INDEX idx_linksy_interactions_provider ON linksy_interactions(provider_id);
CREATE INDEX idx_linksy_interactions_created ON linksy_interactions(created_at DESC);
ALTER TABLE linksy_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interactions_anon_insert" ON linksy_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "interactions_admin_read" ON linksy_interactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'site_admin'));
;


-- ************************************************************
-- Migration: 20260216175036_linksy_functions_and_triggers.sql
-- ************************************************************


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Semantic search for needs
CREATE OR REPLACE FUNCTION linksy_search_needs(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, name TEXT, category_name TEXT, synonyms TEXT[], similarity FLOAT)
LANGUAGE sql STABLE
AS $$
  SELECT n.id, n.name, nc.name AS category_name, n.synonyms,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM linksy_needs n
  JOIN linksy_need_categories nc ON nc.id = n.category_id
  WHERE n.is_active = true AND n.embedding IS NOT NULL
    AND (p_site_id IS NULL OR n.site_id = p_site_id)
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Proximity search returning LLM context cards
CREATE OR REPLACE FUNCTION linksy_search_providers_nearby(
  p_latitude FLOAT, p_longitude FLOAT,
  p_radius_miles INTEGER DEFAULT 25,
  p_need_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (provider_id UUID, provider_name TEXT, distance_miles FLOAT, llm_context_card TEXT, needs TEXT[])
LANGUAGE sql STABLE
AS $$
  SELECT p.id, p.name,
    ST_Distance(l.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) / 1609.34 AS distance_miles,
    p.llm_context_card,
    ARRAY_AGG(DISTINCT n.name) FILTER (WHERE n.name IS NOT NULL) AS needs
  FROM linksy_providers p
  JOIN linksy_locations l ON l.provider_id = p.id AND l.is_active = true
  LEFT JOIN linksy_provider_needs pn ON pn.provider_id = p.id
  LEFT JOIN linksy_needs n ON n.id = pn.need_id
  WHERE p.is_active = true
    AND (p_site_id IS NULL OR p.site_id = p_site_id)
    AND ST_DWithin(l.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_miles * 1609.34)
    AND (p_need_id IS NULL OR pn.need_id = p_need_id)
  GROUP BY p.id, p.name, l.location, p.llm_context_card
  ORDER BY distance_miles
  LIMIT p_limit;
$$;

-- Generate LLM context card for a provider
CREATE OR REPLACE FUNCTION linksy_generate_context_card(p_provider_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_provider RECORD;
  v_location RECORD;
  v_needs TEXT[];
  v_card TEXT;
BEGIN
  SELECT * INTO v_provider FROM linksy_providers WHERE id = p_provider_id;
  SELECT * INTO v_location FROM linksy_locations WHERE provider_id = p_provider_id AND is_primary = true LIMIT 1;
  SELECT ARRAY_AGG(n.name ORDER BY n.name) INTO v_needs
    FROM linksy_provider_needs pn JOIN linksy_needs n ON n.id = pn.need_id WHERE pn.provider_id = p_provider_id;

  v_card := '## ' || v_provider.name || E'\n';
  IF v_provider.description IS NOT NULL THEN v_card := v_card || v_provider.description || E'\n\n'; END IF;
  IF v_provider.phone IS NOT NULL THEN v_card := v_card || '**Phone:** ' || v_provider.phone || E'\n'; END IF;
  IF v_provider.email IS NOT NULL THEN v_card := v_card || '**Email:** ' || v_provider.email || E'\n'; END IF;
  IF v_provider.hours_of_operation IS NOT NULL THEN v_card := v_card || '**Hours:** ' || v_provider.hours_of_operation || E'\n'; END IF;
  IF v_location IS NOT NULL AND v_location.address_line1 IS NOT NULL THEN
    v_card := v_card || '**Address:** ' || v_location.address_line1;
    IF v_location.city IS NOT NULL THEN v_card := v_card || ', ' || v_location.city; END IF;
    IF v_location.state IS NOT NULL THEN v_card := v_card || ', ' || v_location.state; END IF;
    IF v_location.postal_code IS NOT NULL THEN v_card := v_card || ' ' || v_location.postal_code; END IF;
    v_card := v_card || E'\n';
  END IF;
  IF v_provider.website IS NOT NULL THEN v_card := v_card || '**Website:** ' || v_provider.website || E'\n'; END IF;
  IF v_needs IS NOT NULL AND array_length(v_needs, 1) > 0 THEN
    v_card := v_card || '**Services:** ' || array_to_string(v_needs, ', ') || E'\n';
  END IF;
  IF v_provider.referral_type = 'contact_directly' THEN
    v_card := v_card || '**Note:** Contact this organization directly' || E'\n';
    IF v_provider.referral_instructions IS NOT NULL THEN v_card := v_card || v_provider.referral_instructions || E'\n'; END IF;
  END IF;
  RETURN v_card;
END;
$$;

-- Crisis keyword check
CREATE OR REPLACE FUNCTION linksy_check_crisis(p_message TEXT, p_site_id UUID)
RETURNS TABLE (crisis_type TEXT, severity TEXT, response_template TEXT, emergency_resources JSONB, matched_keyword TEXT)
LANGUAGE sql STABLE AS $$
  SELECT ck.crisis_type, ck.severity, ck.response_template, ck.emergency_resources, ck.keyword
  FROM linksy_crisis_keywords ck
  WHERE ck.site_id = p_site_id AND ck.is_active = true
    AND p_message ILIKE '%' || ck.keyword || '%'
  ORDER BY CASE ck.severity WHEN 'high' THEN 1 ELSE 2 END
  LIMIT 1;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION linksy_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_linksy_providers_updated BEFORE UPDATE ON linksy_providers FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_locations_updated BEFORE UPDATE ON linksy_locations FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_need_categories_updated BEFORE UPDATE ON linksy_need_categories FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_needs_updated BEFORE UPDATE ON linksy_needs FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_tickets_updated BEFORE UPDATE ON linksy_tickets FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();
CREATE TRIGGER trg_linksy_events_updated BEFORE UPDATE ON linksy_events FOR EACH ROW EXECUTE FUNCTION linksy_set_updated_at();

-- Auto-regenerate LLM context card on provider changes
CREATE OR REPLACE FUNCTION linksy_refresh_context_card()
RETURNS TRIGGER AS $$
BEGIN
  NEW.llm_context_card := linksy_generate_context_card(NEW.id);
  NEW.llm_context_card_generated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_linksy_providers_context_card
  BEFORE INSERT OR UPDATE OF name, description, phone, email, website, hours_of_operation, referral_type, referral_instructions
  ON linksy_providers
  FOR EACH ROW EXECUTE FUNCTION linksy_refresh_context_card();
;


-- ************************************************************
-- Migration: 20260216204306_fix_handle_new_user_schema.sql
-- ************************************************************

-- Fix handle_new_user to explicitly reference public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;;


-- ************************************************************
-- Migration: 20260216210054_add_provider_contacts_read_policy.sql
-- ************************************************************

-- Allow authenticated users to read all provider contacts
-- This is needed for displaying contacts on provider detail pages
CREATE POLICY "provider_contacts_authenticated_read"
ON linksy_provider_contacts
FOR SELECT
TO authenticated
USING (true);;


-- ************************************************************
-- Migration: 20260216210224_disable_rls_provider_contacts.sql
-- ************************************************************

-- Disable RLS on provider contacts since API routes handle auth
-- The service client can't use auth.uid() policies anyway
ALTER TABLE linksy_provider_contacts DISABLE ROW LEVEL SECURITY;;


-- ************************************************************
-- Migration: 20260216221026_create_support_tickets.sql
-- ************************************************************

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


-- ************************************************************
-- Migration: 20260216222629_add_default_referral_handler.sql
-- ************************************************************

-- Add default referral handler flag to provider contacts
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS is_default_referral_handler BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_provider_contacts_default_handler
ON linksy_provider_contacts(provider_id, is_default_referral_handler)
WHERE is_default_referral_handler = true;

-- Ensure only one default handler per provider
-- This is a constraint function that will be triggered before insert/update
CREATE OR REPLACE FUNCTION enforce_single_default_referral_handler()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this contact as default, unset all others for this provider
  IF NEW.is_default_referral_handler = true THEN
    UPDATE linksy_provider_contacts
    SET is_default_referral_handler = false
    WHERE provider_id = NEW.provider_id
      AND id != NEW.id
      AND is_default_referral_handler = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_default_referral_handler_trigger ON linksy_provider_contacts;

CREATE TRIGGER enforce_single_default_referral_handler_trigger
BEFORE INSERT OR UPDATE ON linksy_provider_contacts
FOR EACH ROW
EXECUTE FUNCTION enforce_single_default_referral_handler();

-- Set the primary contact as default handler for each provider (if they have one)
UPDATE linksy_provider_contacts pc1
SET is_default_referral_handler = true
WHERE is_primary_contact = true
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_contacts pc2
    WHERE pc2.provider_id = pc1.provider_id
      AND pc2.is_default_referral_handler = true
  );

-- For providers without a primary contact, set the first contact as default
UPDATE linksy_provider_contacts pc1
SET is_default_referral_handler = true
WHERE id IN (
  SELECT DISTINCT ON (provider_id) id
  FROM linksy_provider_contacts
  WHERE provider_id IN (
    -- Providers without any default handler yet
    SELECT DISTINCT provider_id
    FROM linksy_provider_contacts pc2
    WHERE NOT EXISTS (
      SELECT 1 FROM linksy_provider_contacts pc3
      WHERE pc3.provider_id = pc2.provider_id
        AND pc3.is_default_referral_handler = true
    )
  )
  ORDER BY provider_id, created_at ASC
);;


-- ************************************************************
-- Migration: 20260216223710_enhance_provider_contacts.sql
-- ************************************************************

-- Enhance provider contacts table with additional fields

-- Add phone number field
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add provider role (admin = full access, user = referral management only)
-- This is separate from contact_type which is about relationship (employee vs customer)
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS provider_role VARCHAR(20) DEFAULT 'user' CHECK (provider_role IN ('admin', 'user'));

-- Add status for archiving contacts
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'invited'));

-- Add invitation tracking
ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ;

-- Allow user_id to be nullable (for contacts without login)
ALTER TABLE linksy_provider_contacts
ALTER COLUMN user_id DROP NOT NULL;

-- Create index for active contacts
CREATE INDEX IF NOT EXISTS idx_provider_contacts_status
ON linksy_provider_contacts(provider_id, status)
WHERE status = 'active';

-- Ensure at least one active admin per provider
CREATE OR REPLACE FUNCTION ensure_provider_has_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- If trying to remove the last admin, prevent it
  IF (TG_OP = 'UPDATE' AND OLD.provider_role = 'admin' AND NEW.provider_role != 'admin') OR
     (TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' AND OLD.provider_role = 'admin') OR
     (TG_OP = 'DELETE' AND OLD.provider_role = 'admin' AND OLD.status = 'active') THEN

    SELECT COUNT(*) INTO admin_count
    FROM linksy_provider_contacts
    WHERE provider_id = OLD.provider_id
      AND provider_role = 'admin'
      AND status = 'active'
      AND id != OLD.id;

    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last active admin for this provider';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_provider_admin_trigger ON linksy_provider_contacts;

CREATE TRIGGER ensure_provider_admin_trigger
BEFORE UPDATE OR DELETE ON linksy_provider_contacts
FOR EACH ROW
EXECUTE FUNCTION ensure_provider_has_admin();

-- Update existing contacts to have proper defaults
UPDATE linksy_provider_contacts
SET
  provider_role = CASE
    WHEN is_primary_contact = true THEN 'admin'
    ELSE 'user'
  END,
  status = 'active'
WHERE provider_role IS NULL OR status IS NULL;

-- Mark contacts with user_id as having accepted invitation
UPDATE linksy_provider_contacts
SET invitation_accepted_at = created_at
WHERE user_id IS NOT NULL AND invitation_accepted_at IS NULL;;


-- ************************************************************
-- Migration: 20260216235043_create_provider_events.sql
-- ************************************************************

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
  EXECUTE FUNCTION update_linksy_provider_events_updated_at();;


-- ************************************************************
-- Migration: 20260217134704_enable_rls_and_vector_indexes.sql
-- ************************************************************


-- ============================================================================
-- TARGETED SECURITY & PERFORMANCE MIGRATION
-- Fixes the remaining gaps identified in the schema audit:
-- 1. Enable RLS on 3 tables where it was disabled
-- 2. Add admin policies for support tables
-- 3. Add IVFFlat vector indexes for embedding-based search
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON TABLES MISSING IT
-- ============================================================================

-- linksy_provider_contacts already has policies but RLS was never enabled
ALTER TABLE public.linksy_provider_contacts ENABLE ROW LEVEL SECURITY;

-- linksy_support_tickets: internal support system
ALTER TABLE public.linksy_support_tickets ENABLE ROW LEVEL SECURITY;

-- linksy_support_ticket_comments
ALTER TABLE public.linksy_support_ticket_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ADD POLICIES FOR SUPPORT TABLES (no policies existed)
-- ============================================================================

-- Site admins manage all support tickets
CREATE POLICY "support_tickets_admin_all" ON public.linksy_support_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'site_admin'
        )
    );

-- Providers can view their own support tickets
CREATE POLICY "support_tickets_provider_read" ON public.linksy_support_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.linksy_provider_contacts pc
            WHERE pc.user_id = auth.uid()
              AND pc.provider_id = linksy_support_tickets.provider_id
              AND pc.status = 'active'
        )
    );

-- Site admins manage all support ticket comments
CREATE POLICY "support_ticket_comments_admin_all" ON public.linksy_support_ticket_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'site_admin'
        )
    );

-- Providers can view and add comments on their own tickets
CREATE POLICY "support_ticket_comments_provider_read" ON public.linksy_support_ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.linksy_support_tickets st
            JOIN public.linksy_provider_contacts pc ON pc.provider_id = st.provider_id
            WHERE st.id = ticket_id
              AND pc.user_id = auth.uid()
              AND pc.status = 'active'
        )
    );

CREATE POLICY "support_ticket_comments_provider_insert" ON public.linksy_support_ticket_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.linksy_support_tickets st
            JOIN public.linksy_provider_contacts pc ON pc.provider_id = st.provider_id
            WHERE st.id = ticket_id
              AND pc.user_id = auth.uid()
              AND pc.status = 'active'
        )
    );

-- ============================================================================
-- 3. ADD IVFFLAT VECTOR INDEXES FOR EMBEDDING SEARCH
-- ============================================================================

-- Needs embedding index (for semantic need matching)
CREATE INDEX IF NOT EXISTS idx_linksy_needs_embedding
    ON public.linksy_needs
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- Providers embedding index (for semantic provider matching)
CREATE INDEX IF NOT EXISTS idx_linksy_providers_embedding
    ON public.linksy_providers
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
;


-- ************************************************************
-- Migration: 20260217140130_airs_211_taxonomy_remap.sql
-- ************************************************************


DO $$
DECLARE
  v_site_id UUID := '86bd8d01-0dc5-4479-beff-666712654104';

  cat_arts           UUID;
  cat_clothing       UUID;
  cat_disaster       UUID;
  cat_education      UUID;
  cat_employment     UUID;
  cat_food           UUID;
  cat_healthcare     UUID;
  cat_housing        UUID;
  cat_income         UUID;
  cat_ind_family     UUID;
  cat_information    UUID;
  cat_legal          UUID;
  cat_mental_health  UUID;
  cat_government     UUID;
  cat_transportation UUID;
  cat_utilities      UUID;
  cat_volunteer      UUID;

BEGIN

-- ============================================================================
-- STEP 1: INSERT 17 AIRS/211 STANDARD CATEGORIES
-- ============================================================================

-- Rename old 'transportation' slug first to free it up for the AIRS category
UPDATE linksy_need_categories
SET slug = 'transportation-legacy'
WHERE site_id = v_site_id AND slug = 'transportation';

INSERT INTO linksy_need_categories
  (site_id, name, slug, description, sort_order, airs_code, is_active)
VALUES
  (v_site_id,
   'Arts, Culture and Recreation', 'arts-culture-recreation',
   'Programs that allow people to fully participate in and enjoy a variety of recreational, social, spiritual, artistic, cultural and intellectual opportunities.',
   10, 'AIRS-ACR', true),

  (v_site_id,
   'Clothing/Personal/Household Needs', 'clothing-personal-household',
   'Programs that provide and/or repair basic household, work-related, and personal necessities for people who need them.',
   20, 'AIRS-CPH', true),

  (v_site_id,
   'Disaster Services', 'disaster-services',
   'Programs that provide emergency planning, preparedness, mitigation, response, relief and/or recovery services prior to, during, and after a major disaster or localized incident.',
   30, 'AIRS-DIS', true),

  (v_site_id,
   'Education', 'education',
   'Programs that provide opportunities for people to acquire the knowledge, skills and general competence to fully participate in community life.',
   40, 'AIRS-EDU', true),

  (v_site_id,
   'Employment', 'employment',
   'Programs that provide employment opportunities, assist people in finding and retaining suitable employment, and develop employment opportunities in various fields.',
   50, 'AIRS-EMP', true),

  (v_site_id,
   'Food/Meals', 'food-meals',
   'Programs that seek to meet the basic nutritional needs of the community by providing access to food.',
   60, 'AIRS-FOO', true),

  (v_site_id,
   'Health Care', 'health-care',
   'Programs that help individuals and families achieve and maintain physical well-being through prevention, screening, evaluation and treatment of illnesses, injuries and disabilities.',
   70, 'AIRS-HLT', true),

  (v_site_id,
   'Housing', 'housing',
   'Programs that seek to meet the basic shelter needs of the community by providing emergency shelter, housing assistance, home improvement programs and housing alternatives.',
   80, 'AIRS-HOU', true),

  (v_site_id,
   'Income Support/Assistance', 'income-support-assistance',
   'Programs that provide financial assistance, emergency payments or cash grants for eligible individuals and families to ensure basic income and access to essential services.',
   90, 'AIRS-INC', true),

  (v_site_id,
   'Individual, Family and Community Support', 'individual-family-community-support',
   'Programs that support individuals, families and the broader community by providing services that replace, protect or supplement family care and advocate for beneficial community changes. Includes programs for the humane care and protection of domestic animals.',
   100, 'AIRS-IFC', true),

  (v_site_id,
   'Information Services', 'information-services',
   'Programs that provide for the collection, classification, storage, retrieval and dissemination of recorded knowledge, including information and referral programs, library services and public awareness campaigns.',
   110, 'AIRS-INF', true),

  (v_site_id,
   'Legal, Consumer and Public Safety', 'legal-consumer-public-safety',
   'Programs that promote and preserve conditions enabling individuals to live in a safe and peaceful environment through law enforcement, consumer protection and public safety programs.',
   120, 'AIRS-LGL', true),

  (v_site_id,
   'Mental Health and Addictions', 'mental-health-addictions',
   'Programs that provide preventive, diagnostic and treatment services to help people achieve and maintain emotional well-being and the skills to cope without excessive stress or reliance on alcohol or other drugs.',
   130, 'AIRS-MHA', true),

  (v_site_id,
   'Other Governmental/Economic Services', 'other-governmental-economic',
   'Programs that reflect broader functions of governmental, economic and organizational development, including international programs, trade associations and academic research.',
   140, 'AIRS-GOV', true),

  (v_site_id,
   'Transportation', 'transportation',
   'Programs that provide for basic transportation needs including conveyance of people and goods, and special arrangements for older adults, people with disabilities and those unable to use public transportation.',
   150, 'AIRS-TRN', true),

  (v_site_id,
   'Utilities', 'utilities',
   'Programs that provide electric, gas, water, phone and other utility bill assistance.',
   160, 'AIRS-UTL', true),

  (v_site_id,
   'Volunteer and Donation', 'volunteer-donation',
   'Community organizations seeking individuals willing to offer services without remuneration on projects that benefit the organization. Includes programs accepting donated goods.',
   170, 'AIRS-VOL', true)

ON CONFLICT (site_id, slug) DO NOTHING;

-- Capture new category IDs
SELECT id INTO cat_arts           FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'arts-culture-recreation';
SELECT id INTO cat_clothing       FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'clothing-personal-household';
SELECT id INTO cat_disaster       FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'disaster-services';
SELECT id INTO cat_education      FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'education';
SELECT id INTO cat_employment     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'employment';
SELECT id INTO cat_food           FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'food-meals';
SELECT id INTO cat_healthcare     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'health-care';
SELECT id INTO cat_housing        FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'housing';
SELECT id INTO cat_income         FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'income-support-assistance';
SELECT id INTO cat_ind_family     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'individual-family-community-support';
SELECT id INTO cat_information    FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'information-services';
SELECT id INTO cat_legal          FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'legal-consumer-public-safety';
SELECT id INTO cat_mental_health  FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'mental-health-addictions';
SELECT id INTO cat_government     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'other-governmental-economic';
SELECT id INTO cat_transportation FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'transportation';
SELECT id INTO cat_utilities      FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'utilities';
SELECT id INTO cat_volunteer      FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'volunteer-donation';

-- ============================================================================
-- STEP 2: REMAP ALL NEEDS TO AIRS CATEGORIES
-- ============================================================================

UPDATE linksy_needs SET category_id = cat_mental_health
WHERE site_id = v_site_id AND slug IN (
  'anger-management','autism','bullying','counseling-one-on-one',
  'eating-disorders','group-counseling','mental-health',
  'residential-facilities','sexual-reactive-children-that-hurt-other-children',
  'substance-abuse',
  'baker-act-all-ages','crisis-help','mental-health-support','substance-abuse-help',
  'addiction-support','grief-support','support-groups'
);

UPDATE linksy_needs SET category_id = cat_clothing
WHERE site_id = v_site_id AND slug IN (
  'clothing-assistance','free-haircuts','furniture-assistance',
  'household-items','hygiene-products','laundry-facility','school-supplies'
);

UPDATE linksy_needs SET category_id = cat_food
WHERE site_id = v_site_id AND slug IN (
  'food-assistance','food-pantry','meal-services'
);

UPDATE linksy_needs SET category_id = cat_housing
WHERE site_id = v_site_id AND slug IN (
  'affordable-housing','emergency-shelter','home-repairs',
  'homelessness-support','mortgage-assistance','rental-assistance','transitional-housing'
);

UPDATE linksy_needs SET category_id = cat_healthcare
WHERE site_id = v_site_id AND slug IN (
  'adult-medical-care','dental-care','health-screenings','pediatric-medicine',
  'pregnancy-assistance','prescription-assistance','vision-care',
  'disability-support','handicap-services'
);

UPDATE linksy_needs SET category_id = cat_education
WHERE site_id = v_site_id AND slug IN (
  'adult-education-programs','ged-high-school-completion','life-skills',
  'literacy-programs','senior-technology-help','elder-technology-assistance'
);

UPDATE linksy_needs SET category_id = cat_employment
WHERE site_id = v_site_id AND slug IN (
  'job-training','vocational-training','workforce-development','employment-assistance'
);

UPDATE linksy_needs SET category_id = cat_transportation
WHERE site_id = v_site_id AND slug IN (
  'bus-passes-transit-vouchers','gas-and-fuel','public-transit-vouchers',
  'transportation-assistance','vehicle-repair-and-used-auto-sales','vehicle-repair-support'
);

UPDATE linksy_needs SET category_id = cat_income
WHERE site_id = v_site_id AND slug IN (
  'financial-counseling','tax-preparation-assistance'
);

UPDATE linksy_needs SET category_id = cat_utilities
WHERE site_id = v_site_id AND slug = 'utility-assistance';

UPDATE linksy_needs SET category_id = cat_legal
WHERE site_id = v_site_id AND slug IN (
  'legal-aid','immigration-services','inmate-support'
);

UPDATE linksy_needs SET category_id = cat_ind_family
WHERE site_id = v_site_id AND slug IN (
  'adoption-support','childcare-assistance','family-counseling',
  'foster-care-support','parenting-resources','youth-programs',
  'animal-rescue',
  'veterans-help',
  'cancer-support','respite-care','special-needs','toys',
  'advocacy-and-case-management','companionship-visits','domestic-violence-support',
  'human-trafficking-support'
);

UPDATE linksy_needs SET category_id = cat_disaster
WHERE site_id = v_site_id AND slug = 'disaster-relief';

UPDATE linksy_needs SET category_id = cat_volunteer
WHERE site_id = v_site_id AND slug = 'volunteer-or-mentoring';

-- ============================================================================
-- STEP 3: MERGE DUPLICATE NEEDS
-- ============================================================================

-- MERGE: "Mental Health" → "Mental Health Support" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health-support')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health-support')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs
SET synonyms = array_cat(COALESCE(synonyms, ARRAY[]::text[]),
  COALESCE((SELECT synonyms FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health'), ARRAY[]::text[]))
WHERE site_id = v_site_id AND slug = 'mental-health-support';
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'mental-health';

-- MERGE: "Substance Abuse" (child) → "Substance Abuse Help" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse-help')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse-help')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs
SET synonyms = array_cat(COALESCE(synonyms, ARRAY[]::text[]),
  COALESCE((SELECT synonyms FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse'), ARRAY[]::text[]))
WHERE site_id = v_site_id AND slug = 'substance-abuse-help';
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'substance-abuse';

-- MERGE: "Elder Technology Assistance" → "Senior Technology Help" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'senior-technology-help')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'elder-technology-assistance')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'senior-technology-help')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'elder-technology-assistance';

-- MERGE: "Handicap Services" → "Disability Support" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'disability-support')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'handicap-services')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'disability-support')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs
SET synonyms = array_cat(COALESCE(synonyms, ARRAY[]::text[]),
  ARRAY['handicap','handicapped','handicap services','handicap support'])
WHERE site_id = v_site_id AND slug = 'disability-support';
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'handicap-services';

-- MERGE: "Bus Passes/Transit Vouchers" → "Public Transit Vouchers" (renamed to "Public Transit Assistance")
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'public-transit-vouchers')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'bus-passes-transit-vouchers')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'public-transit-vouchers')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'bus-passes-transit-vouchers';
UPDATE linksy_needs
SET name = 'Public Transit Assistance',
    slug = 'public-transit-assistance',
    synonyms = ARRAY['bus pass','bus passes','transit vouchers','ride','bus tickets','transportation voucher','bus ride','transit help']
WHERE site_id = v_site_id AND slug = 'public-transit-vouchers';

-- ============================================================================
-- STEP 4: DEACTIVATE OLD CUSTOM CATEGORIES
-- ============================================================================

UPDATE linksy_need_categories SET is_active = false
WHERE site_id = v_site_id AND slug IN (
  'child-adolescent-mental-health',
  'food-and-daily-needs',
  'human-trafficking',
  'special-situations',
  'pets-and-animals',
  'legal-help',
  'learning-and-education',
  'mind-and-wellness',
  'money-help',
  'home-and-shelter',
  'disability-services',
  'veterans-services',
  'vehicle-assistance',
  'healthcare',
  'transportation-legacy',
  'family-child-services',
  'employment-financial-stability',
  'community-support'
);

END $$;
;


-- ************************************************************
-- Migration: 20260217160235_linksy_host_system.sql
-- ************************************************************


-- ============================================================
-- Host System: providers that embed the widget on their site
-- ============================================================

ALTER TABLE public.linksy_providers
  ADD COLUMN IF NOT EXISTS is_host BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_embed_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS host_widget_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS host_allowed_domains TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS host_tokens_used_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS host_searches_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS host_monthly_token_budget INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS host_usage_reset_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_providers_host_slug
  ON public.linksy_providers (slug)
  WHERE is_host = true AND is_active = true AND host_embed_active = true;

ALTER TABLE public.linksy_search_sessions
  ADD COLUMN IF NOT EXISTS host_provider_id UUID REFERENCES public.linksy_providers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_search_sessions_host
  ON public.linksy_search_sessions (host_provider_id)
  WHERE host_provider_id IS NOT NULL;

-- ============================================================
-- RPC: increment host usage counters atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.linksy_increment_host_usage(
  p_host_provider_id UUID,
  p_tokens_used INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.linksy_providers
  SET
    host_usage_reset_at          = CASE
      WHEN host_usage_reset_at IS NULL OR host_usage_reset_at < NOW() - INTERVAL '30 days'
      THEN NOW()
      ELSE host_usage_reset_at
    END,
    host_tokens_used_this_month  = CASE
      WHEN host_usage_reset_at IS NULL OR host_usage_reset_at < NOW() - INTERVAL '30 days'
      THEN p_tokens_used
      ELSE host_tokens_used_this_month + p_tokens_used
    END,
    host_searches_this_month     = CASE
      WHEN host_usage_reset_at IS NULL OR host_usage_reset_at < NOW() - INTERVAL '30 days'
      THEN 1
      ELSE host_searches_this_month + 1
    END
  WHERE id = p_host_provider_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.linksy_increment_host_usage(UUID, INTEGER) TO authenticated, anon;

-- ============================================================
-- RPC: resolve host by slug (widget page load)
-- ============================================================
CREATE OR REPLACE FUNCTION public.linksy_resolve_host(p_slug TEXT)
RETURNS TABLE (
  provider_id   UUID,
  provider_name TEXT,
  widget_config JSONB,
  over_budget   BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    p.host_widget_config,
    CASE
      WHEN p.host_monthly_token_budget IS NOT NULL
        AND p.host_tokens_used_this_month >= p.host_monthly_token_budget
      THEN true ELSE false
    END AS over_budget
  FROM public.linksy_providers p
  WHERE p.slug = p_slug
    AND p.is_host = true
    AND p.is_active = true
    AND p.host_embed_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.linksy_resolve_host(TEXT) TO anon, authenticated;
;


-- ************************************************************
-- Migration: 20260217162657_linksy_docs.sql
-- ************************************************************

CREATE TABLE public.linksy_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  min_role TEXT NOT NULL DEFAULT 'user'
    CHECK (min_role IN ('user', 'provider_employee', 'tenant_admin', 'site_admin')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);
CREATE INDEX linksy_docs_fts_idx ON public.linksy_docs USING gin(search_vector);
CREATE INDEX linksy_docs_category_idx ON public.linksy_docs (category, sort_order);;


-- ************************************************************
-- Migration: 20260217165057_add_is_private_to_provider_notes.sql
-- ************************************************************

ALTER TABLE public.linksy_provider_notes
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;;


-- ************************************************************
-- Migration: 20260217181006_add_nearby_provider_ids_function.sql
-- ************************************************************


CREATE OR REPLACE FUNCTION linksy_nearby_provider_ids(
  lat  double precision,
  lng  double precision,
  radius_meters double precision
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT provider_id
  FROM public.linksy_locations
  WHERE location IS NOT NULL
    AND ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
$$;
;


-- ************************************************************
-- Migration: 20260217192720_add_session_increment_and_docs_rls.sql
-- ************************************************************


-- ============================================================================
-- 1. Session increment helper function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.linksy_increment_session_usage(
  p_session_id uuid,
  p_tokens integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.linksy_search_sessions
  SET
    message_count    = COALESCE(message_count, 0) + 1,
    total_tokens_used = COALESCE(total_tokens_used, 0) + p_tokens
  WHERE id = p_session_id;
$$;

-- ============================================================================
-- 2. Allow anon UPDATE on their own search sessions (for crisis flag, etc.)
-- ============================================================================
CREATE POLICY "sessions_anon_update" ON public.linksy_search_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Allow anon SELECT on their own session (so they can re-fetch sessionId)
-- ============================================================================
-- (The admin select policy already exists; add a broad one for public reads
--  scoped to what the API returns — our service client bypasses RLS anyway,
--  but add this for completeness)

-- ============================================================================
-- 4. Enable RLS on linksy_docs and add role-based policies
-- ============================================================================
ALTER TABLE public.linksy_docs ENABLE ROW LEVEL SECURITY;

-- Published docs visible to all authenticated users
CREATE POLICY "docs_authenticated_read" ON public.linksy_docs
  FOR SELECT
  USING (
    is_published = true
    AND auth.uid() IS NOT NULL
  );

-- Site admins manage all docs
CREATE POLICY "docs_admin_all" ON public.linksy_docs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'site_admin'
    )
  );
;


-- ************************************************************
-- Migration: 20260217192742_add_service_clicked_helper.sql
-- ************************************************************


CREATE OR REPLACE FUNCTION public.linksy_add_service_clicked(
  p_session_id uuid,
  p_provider_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.linksy_search_sessions
  SET services_clicked = array_append(
    COALESCE(services_clicked, ARRAY[]::uuid[]),
    p_provider_id
  )
  WHERE id = p_session_id
    AND NOT (COALESCE(services_clicked, ARRAY[]::uuid[]) @> ARRAY[p_provider_id]);
$$;
;


-- ************************************************************
-- Migration: 20260218202411_add_recurrence_rule_to_provider_events.sql
-- ************************************************************

ALTER TABLE public.linksy_provider_events
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT DEFAULT NULL;;


-- ************************************************************
-- Migration: 20260218205438_resolve_host_return_allowed_domains.sql
-- ************************************************************

DROP FUNCTION IF EXISTS public.linksy_resolve_host(text);

CREATE FUNCTION public.linksy_resolve_host(p_slug text)
 RETURNS TABLE(provider_id uuid, provider_name text, widget_config jsonb, over_budget boolean, allowed_domains text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    p.host_widget_config,
    CASE
      WHEN p.host_monthly_token_budget IS NOT NULL
        AND p.host_tokens_used_this_month >= p.host_monthly_token_budget
      THEN true ELSE false
    END AS over_budget,
    p.host_allowed_domains
  FROM public.linksy_providers p
  WHERE p.slug = p_slug
    AND p.is_host = true
    AND p.is_active = true
    AND p.host_embed_active = true
  LIMIT 1;
$$;;


-- ************************************************************
-- Migration: 20260219152656_create_linksy_provider_applications.sql
-- ************************************************************


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


-- ************************************************************
-- Migration: 20260219172652_add_attachments_to_provider_notes.sql
-- ************************************************************

ALTER TABLE linksy_provider_notes
  ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;;


-- ************************************************************
-- Migration: 20260219220853_add_provider_status_and_accepting_referrals.sql
-- ************************************************************


-- Add provider_status column (active, paused, inactive)
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS provider_status text NOT NULL DEFAULT 'active'
  CHECK (provider_status IN ('active', 'paused', 'inactive'));

-- Migrate existing is_active boolean to provider_status
UPDATE linksy_providers SET provider_status = 'active' WHERE is_active = true;
UPDATE linksy_providers SET provider_status = 'inactive' WHERE is_active = false;

-- Add accepting_referrals boolean
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS accepting_referrals boolean NOT NULL DEFAULT true;
;


-- ************************************************************
-- Migration: 20260219220857_add_sla_due_at_to_tickets.sql
-- ************************************************************


-- Add sla_due_at column to tickets
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;

-- Backfill sla_due_at for existing tickets (created_at + 48 hours)
UPDATE linksy_tickets SET sla_due_at = created_at + interval '48 hours' WHERE sla_due_at IS NULL;

-- Create trigger to auto-set sla_due_at on insert
CREATE OR REPLACE FUNCTION linksy_set_sla_due_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := NEW.created_at + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_linksy_set_sla_due_at ON linksy_tickets;
CREATE TRIGGER trg_linksy_set_sla_due_at
  BEFORE INSERT ON linksy_tickets
  FOR EACH ROW EXECUTE FUNCTION linksy_set_sla_due_at();
;


-- ************************************************************
-- Migration: 20260219220901_create_call_logs_table.sql
-- ************************************************************


CREATE TABLE IF NOT EXISTS linksy_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES linksy_providers(id) ON DELETE SET NULL,
  caller_name text,
  call_type text NOT NULL DEFAULT 'outbound' CHECK (call_type IN ('inbound', 'outbound')),
  duration_minutes integer,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by ticket
CREATE INDEX IF NOT EXISTS idx_call_logs_ticket_id ON linksy_call_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_provider_id ON linksy_call_logs(provider_id);

-- Enable RLS
ALTER TABLE linksy_call_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write
CREATE POLICY "Authenticated users can manage call logs" ON linksy_call_logs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
;


-- ************************************************************
-- Migration: 20260219220905_create_host_crisis_overrides_table.sql
-- ************************************************************


-- Host-specific crisis keyword overrides
CREATE TABLE IF NOT EXISTS linksy_host_crisis_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  keyword_id uuid NOT NULL REFERENCES linksy_crisis_keywords(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('include', 'exclude')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(host_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_host_crisis_overrides_host ON linksy_host_crisis_overrides(host_id);

-- Add excluded_search_terms JSONB to providers (for hosts)
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS excluded_search_terms jsonb DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE linksy_host_crisis_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage crisis overrides" ON linksy_host_crisis_overrides
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
;


-- ************************************************************
-- Migration: 20260219220912_create_email_templates_table.sql
-- ************************************************************


CREATE TABLE IF NOT EXISTS linksy_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed with existing hardcoded templates
INSERT INTO linksy_email_templates (slug, name, subject, body_html, variables) VALUES
  ('new_ticket_notification', 'New Ticket Notification', 'New referral ticket #{{ticketNumber}} — {{providerName}}', '<p>Template managed in code. Edit to customize.</p>', '["contactName","ticketNumber","clientName","needName","description","providerName","ticketUrl"]'::jsonb),
  ('ticket_status_update', 'Ticket Status Update', 'Your referral status has been updated — {{statusLabel}}', '<p>Template managed in code. Edit to customize.</p>', '["clientName","ticketNumber","newStatus","providerName","needName"]'::jsonb),
  ('invitation', 'User Invitation', 'You''ve been invited to join {{tenantName}} on {{appName}}', '<p>Template managed in code. Edit to customize.</p>', '["inviterName","tenantName","role","inviteUrl"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE linksy_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read email templates" ON linksy_email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage email templates" ON linksy_email_templates
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
;


-- ************************************************************
-- Migration: 20260219220917_create_surveys_table.sql
-- ************************************************************


CREATE TABLE IF NOT EXISTS linksy_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES linksy_tickets(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  client_email text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_ticket_id ON linksy_surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_surveys_token ON linksy_surveys(token);

-- Enable RLS
ALTER TABLE linksy_surveys ENABLE ROW LEVEL SECURITY;

-- Public access for survey submission (token-based)
CREATE POLICY "Anyone can read surveys by token" ON linksy_surveys
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update surveys by token" ON linksy_surveys
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage surveys" ON linksy_surveys
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read surveys" ON linksy_surveys
  FOR SELECT USING (auth.role() = 'authenticated');
;


-- ************************************************************
-- Migration: 20260219220920_create_custom_fields_table.sql
-- ************************************************************


-- Dynamic intake form custom fields per provider
CREATE TABLE IF NOT EXISTS linksy_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'select', 'checkbox', 'date')),
  options jsonb DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_provider ON linksy_custom_fields(provider_id);

-- Enable RLS
ALTER TABLE linksy_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage custom fields" ON linksy_custom_fields
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
;


-- ************************************************************
-- Migration: 20260219232528_add_structured_columns_to_provider_applications.sql
-- ************************************************************


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


-- ************************************************************
-- Migration: 20260223120000_create_webhooks_system.sql
-- ************************************************************

-- Webhooks system for outbound event delivery

CREATE TABLE IF NOT EXISTS linksy_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_delivery_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linksy_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES linksy_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_code INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linksy_webhooks_tenant_id
  ON linksy_webhooks(tenant_id);

CREATE INDEX IF NOT EXISTS idx_linksy_webhooks_is_active
  ON linksy_webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_linksy_webhook_deliveries_webhook_id
  ON linksy_webhook_deliveries(webhook_id);

CREATE INDEX IF NOT EXISTS idx_linksy_webhook_deliveries_created_at
  ON linksy_webhook_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_linksy_webhook_deliveries_success
  ON linksy_webhook_deliveries(success);

DROP TRIGGER IF EXISTS update_linksy_webhooks_updated_at ON linksy_webhooks;
CREATE TRIGGER update_linksy_webhooks_updated_at
  BEFORE UPDATE ON linksy_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE linksy_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE linksy_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tenant webhooks"
  ON linksy_webhooks FOR SELECT
  USING (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can create tenant webhooks"
  ON linksy_webhooks FOR INSERT
  WITH CHECK (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can update tenant webhooks"
  ON linksy_webhooks FOR UPDATE
  USING (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete tenant webhooks"
  ON linksy_webhooks FOR DELETE
  USING (is_site_admin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Admins can view webhook deliveries"
  ON linksy_webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM linksy_webhooks w
      WHERE w.id = webhook_id
      AND (is_site_admin() OR is_tenant_admin(w.tenant_id))
    )
  );

CREATE POLICY "System can create webhook deliveries"
  ON linksy_webhook_deliveries FOR INSERT
  WITH CHECK (true);


-- ************************************************************
-- Migration: 20260223133000_create_email_templates.sql
-- ************************************************************

-- Email template customization overrides
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS linksy_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- RLS intentionally omitted here to avoid hard dependency on helper functions
-- in older environments. Access is enforced by server-side site-admin checks.


-- ************************************************************
-- Migration: 20260223160000_add_is_pinned_to_provider_notes.sql
-- ************************************************************

-- Add pin support for provider notes
ALTER TABLE IF EXISTS linksy_provider_notes
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF to_regclass('public.linksy_provider_notes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_is_pinned
      ON linksy_provider_notes(provider_id, is_pinned, created_at DESC);
  END IF;
END $$;


-- ************************************************************
-- Migration: 20260223173000_add_provider_contact_preferences.sql
-- ************************************************************

-- Provider contact preference fields used on Summary page
ALTER TABLE IF EXISTS public.linksy_providers
  ADD COLUMN IF NOT EXISTS contact_method TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS allow_contact_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_follow_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_bulk_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_contact_phone BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_contact_fax BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_contact_mail BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF to_regclass('public.linksy_providers') IS NOT NULL THEN
    ALTER TABLE public.linksy_providers
      DROP CONSTRAINT IF EXISTS linksy_providers_contact_method_check;

    ALTER TABLE public.linksy_providers
      ADD CONSTRAINT linksy_providers_contact_method_check
      CHECK (contact_method IN ('all', 'email', 'phone', 'fax', 'mail'));
  END IF;
END $$;


-- ************************************************************
-- Migration: 20260223181500_remap_and_cleanup_legacy_need_categories.sql
-- ************************************************************

-- Remap referenced legacy need categories to active AIRS categories, then remove unused legacy categories.
DO $$
DECLARE
  legacy_mind_wellness_id uuid;
  legacy_money_help_id uuid;
  active_mha_id uuid;
  active_income_support_id uuid;
BEGIN
  -- Resolve category IDs by slug.
  SELECT id INTO legacy_mind_wellness_id
  FROM public.linksy_need_categories
  WHERE slug = 'mind-and-wellness'
  LIMIT 1;

  SELECT id INTO legacy_money_help_id
  FROM public.linksy_need_categories
  WHERE slug = 'money-help'
  LIMIT 1;

  SELECT id INTO active_mha_id
  FROM public.linksy_need_categories
  WHERE slug = 'mental-health-addictions'
  LIMIT 1;

  SELECT id INTO active_income_support_id
  FROM public.linksy_need_categories
  WHERE slug = 'income-support-assistance'
  LIMIT 1;

  -- Remap needs that currently point to legacy categories.
  IF legacy_mind_wellness_id IS NOT NULL AND active_mha_id IS NOT NULL THEN
    UPDATE public.linksy_needs
    SET category_id = active_mha_id,
        updated_at = NOW()
    WHERE category_id = legacy_mind_wellness_id;
  END IF;

  IF legacy_money_help_id IS NOT NULL AND active_income_support_id IS NOT NULL THEN
    UPDATE public.linksy_needs
    SET category_id = active_income_support_id,
        updated_at = NOW()
    WHERE category_id = legacy_money_help_id;
  END IF;

  -- Remove inactive categories that no longer have any needs.
  DELETE FROM public.linksy_need_categories c
  WHERE c.is_active = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.linksy_needs n
      WHERE n.category_id = c.id
    );
END $$;


-- ************************************************************
-- Migration: 20260224092606_add_phone_extension_to_providers.sql
-- ************************************************************

-- Add phone extension field to providers
-- This allows providers to specify an extension for their main phone number (e.g., "x123" or "ext. 456")

ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_providers.phone_extension IS 'Phone extension for the main phone number (e.g., "x123", "ext. 456")';


-- ************************************************************
-- Migration: 20260224092805_update_context_card_with_phone_extension.sql
-- ************************************************************

-- Update linksy_generate_context_card function to include phone extension
-- This ensures the AI context cards show phone extensions when present

CREATE OR REPLACE FUNCTION linksy_generate_context_card(p_provider_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_provider RECORD;
  v_location RECORD;
  v_needs TEXT[];
  v_card TEXT := '';
BEGIN
  SELECT * INTO v_provider FROM linksy_providers WHERE id = p_provider_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_location FROM linksy_locations WHERE provider_id = p_provider_id AND is_primary = true LIMIT 1;
  SELECT ARRAY_AGG(n.name ORDER BY n.name) INTO v_needs
    FROM linksy_provider_needs pn JOIN linksy_needs n ON n.id = pn.need_id WHERE pn.provider_id = p_provider_id;

  v_card := '## ' || v_provider.name || E'\n';
  IF v_provider.description IS NOT NULL THEN v_card := v_card || v_provider.description || E'\n\n'; END IF;

  -- Phone with optional extension
  IF v_provider.phone IS NOT NULL THEN
    v_card := v_card || '**Phone:** ' || v_provider.phone;
    IF v_provider.phone_extension IS NOT NULL AND v_provider.phone_extension != '' THEN
      v_card := v_card || ' ext. ' || v_provider.phone_extension;
    END IF;
    v_card := v_card || E'\n';
  END IF;

  IF v_provider.email IS NOT NULL THEN v_card := v_card || '**Email:** ' || v_provider.email || E'\n'; END IF;
  IF v_provider.hours_of_operation IS NOT NULL THEN v_card := v_card || '**Hours:** ' || v_provider.hours_of_operation || E'\n'; END IF;
  IF v_location IS NOT NULL AND v_location.address_line1 IS NOT NULL THEN
    v_card := v_card || '**Address:** ' || v_location.address_line1;
    IF v_location.city IS NOT NULL THEN v_card := v_card || ', ' || v_location.city; END IF;
    IF v_location.state IS NOT NULL THEN v_card := v_card || ', ' || v_location.state; END IF;
    IF v_location.postal_code IS NOT NULL THEN v_card := v_card || ' ' || v_location.postal_code; END IF;
    v_card := v_card || E'\n';
  END IF;
  IF v_provider.website IS NOT NULL THEN v_card := v_card || '**Website:** ' || v_provider.website || E'\n'; END IF;
  IF v_needs IS NOT NULL AND array_length(v_needs, 1) > 0 THEN
    v_card := v_card || '**Services:** ' || array_to_string(v_needs, ', ') || E'\n';
  END IF;

  IF v_provider.referral_type = 'contact_directly' AND v_provider.referral_instructions IS NOT NULL THEN
    v_card := v_card || E'\n**How to get help:** ' || v_provider.referral_instructions || E'\n';
  END IF;

  RETURN v_card;
END;
$$;

-- Trigger to auto-regenerate context card still uses the updated function
-- No changes needed to the trigger itself


-- ************************************************************
-- Migration: 20260224093639_add_service_zip_codes_to_providers.sql
-- ************************************************************

-- Add service ZIP codes field to providers
-- Allows providers to specify which ZIP codes they serve
-- NULL or empty array means they serve all areas ("any")

ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS service_zip_codes TEXT[];

COMMENT ON COLUMN linksy_providers.service_zip_codes IS 'ZIP codes this provider serves. NULL/empty = serves all areas. Example: {''32003'', ''32065'', ''32073''}';

-- Create index for faster ZIP code lookups
CREATE INDEX IF NOT EXISTS idx_linksy_providers_service_zip_codes
ON linksy_providers USING GIN (service_zip_codes);


-- ************************************************************
-- Migration: 20260224093911_update_context_card_with_service_zips.sql
-- ************************************************************

-- Update linksy_generate_context_card function to include service ZIP codes
-- This ensures the AI context cards show service area information

CREATE OR REPLACE FUNCTION linksy_generate_context_card(p_provider_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_provider RECORD;
  v_location RECORD;
  v_needs TEXT[];
  v_card TEXT := '';
BEGIN
  SELECT * INTO v_provider FROM linksy_providers WHERE id = p_provider_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_location FROM linksy_locations WHERE provider_id = p_provider_id AND is_primary = true LIMIT 1;
  SELECT ARRAY_AGG(n.name ORDER BY n.name) INTO v_needs
    FROM linksy_provider_needs pn JOIN linksy_needs n ON n.id = pn.need_id WHERE pn.provider_id = p_provider_id;

  v_card := '## ' || v_provider.name || E'\n';
  IF v_provider.description IS NOT NULL THEN v_card := v_card || v_provider.description || E'\n\n'; END IF;

  -- Phone with optional extension
  IF v_provider.phone IS NOT NULL THEN
    v_card := v_card || '**Phone:** ' || v_provider.phone;
    IF v_provider.phone_extension IS NOT NULL AND v_provider.phone_extension != '' THEN
      v_card := v_card || ' ext. ' || v_provider.phone_extension;
    END IF;
    v_card := v_card || E'\n';
  END IF;

  IF v_provider.email IS NOT NULL THEN v_card := v_card || '**Email:** ' || v_provider.email || E'\n'; END IF;
  IF v_provider.hours_of_operation IS NOT NULL THEN v_card := v_card || '**Hours:** ' || v_provider.hours_of_operation || E'\n'; END IF;
  IF v_location IS NOT NULL AND v_location.address_line1 IS NOT NULL THEN
    v_card := v_card || '**Address:** ' || v_location.address_line1;
    IF v_location.city IS NOT NULL THEN v_card := v_card || ', ' || v_location.city; END IF;
    IF v_location.state IS NOT NULL THEN v_card := v_card || ', ' || v_location.state; END IF;
    IF v_location.postal_code IS NOT NULL THEN v_card := v_card || ' ' || v_location.postal_code; END IF;
    v_card := v_card || E'\n';
  END IF;

  -- Service area (ZIP codes)
  IF v_provider.service_zip_codes IS NOT NULL AND array_length(v_provider.service_zip_codes, 1) > 0 THEN
    v_card := v_card || '**Service Area:** ZIP codes ' || array_to_string(v_provider.service_zip_codes, ', ') || E'\n';
  ELSE
    v_card := v_card || '**Service Area:** All areas' || E'\n';
  END IF;

  IF v_provider.website IS NOT NULL THEN v_card := v_card || '**Website:** ' || v_provider.website || E'\n'; END IF;
  IF v_needs IS NOT NULL AND array_length(v_needs, 1) > 0 THEN
    v_card := v_card || '**Services:** ' || array_to_string(v_needs, ', ') || E'\n';
  END IF;

  IF v_provider.referral_type = 'contact_directly' AND v_provider.referral_instructions IS NOT NULL THEN
    v_card := v_card || E'\n**How to get help:** ' || v_provider.referral_instructions || E'\n';
  END IF;

  RETURN v_card;
END;
$$;

-- Update the auto-regeneration trigger to include service_zip_codes in the watch list
DROP TRIGGER IF EXISTS linksy_providers_context_card_trigger ON linksy_providers;

CREATE TRIGGER linksy_providers_context_card_trigger
BEFORE INSERT OR UPDATE OF name, description, phone, phone_extension, email, website, hours_of_operation, referral_type, referral_instructions, service_zip_codes
ON linksy_providers
FOR EACH ROW
EXECUTE FUNCTION linksy_refresh_context_card();


-- ************************************************************
-- Migration: 20260224120000_add_call_log_note_type.sql
-- ************************************************************

-- Add call_log to note_type enum
ALTER TYPE linksy_note_type ADD VALUE IF NOT EXISTS 'call_log';


-- ************************************************************
-- Migration: 20260224120001_add_call_log_data_column.sql
-- ************************************************************

-- Add structured call log data column
-- This stores call-specific metadata like duration, outcome, caller info, etc.
ALTER TABLE linksy_provider_notes
ADD COLUMN IF NOT EXISTS call_log_data JSONB;

COMMENT ON COLUMN linksy_provider_notes.call_log_data IS 'Structured call log data: { duration_minutes, call_outcome, caller_name, caller_phone, caller_email, follow_up_required, follow_up_date }';

-- Create index for querying call logs
CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_call_log
ON linksy_provider_notes(provider_id, note_type, created_at DESC)
WHERE note_type = 'call_log';


-- ************************************************************
-- Migration: 20260224130000_add_pending_approval_status.sql
-- ************************************************************

-- Add import approval tracking columns
-- provider_status is TEXT so we can use 'pending_approval' as a new value without altering an enum

ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS import_source TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN linksy_providers.imported_at IS 'When this provider was imported (if applicable)';
COMMENT ON COLUMN linksy_providers.import_source IS 'Source of import: legacy_csv, api, manual, etc.';
COMMENT ON COLUMN linksy_providers.reviewed_by IS 'Admin who approved/rejected this imported provider';
COMMENT ON COLUMN linksy_providers.reviewed_at IS 'When the import was reviewed';

-- Create index for pending approval queries
CREATE INDEX IF NOT EXISTS idx_linksy_providers_pending_approval
ON linksy_providers(provider_status, imported_at DESC)
WHERE provider_status = 'pending_approval';


-- ************************************************************
-- Migration: 20260224140000_add_parent_child_provider_linking.sql
-- ************************************************************

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


-- ************************************************************
-- Migration: 20260224155900_add_provider_admin_contact_types.sql
-- ************************************************************

-- Add admin contact types for provider contacts
-- Required for policies that reference provider_admin/org_admin

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'linksy_contact_type'
      AND e.enumlabel = 'provider_admin'
  ) THEN
    ALTER TYPE linksy_contact_type ADD VALUE 'provider_admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'linksy_contact_type'
      AND e.enumlabel = 'org_admin'
  ) THEN
    ALTER TYPE linksy_contact_type ADD VALUE 'org_admin';
  END IF;
END $$;


-- ************************************************************
-- Migration: 20260224160000_create_host_email_templates.sql
-- ************************************************************

-- Host-specific email template overrides
-- Allows each host to customize email templates sent from their widget

CREATE TABLE IF NOT EXISTS linksy_host_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(host_id, template_key)
);

COMMENT ON TABLE linksy_host_email_templates IS 'Host-specific email template overrides for white-label branding';
COMMENT ON COLUMN linksy_host_email_templates.host_id IS 'Provider that owns this template (must be a host)';
COMMENT ON COLUMN linksy_host_email_templates.template_key IS 'Template identifier (e.g., new_referral_to_provider, referral_status_update)';
COMMENT ON COLUMN linksy_host_email_templates.name IS 'Human-readable template name';
COMMENT ON COLUMN linksy_host_email_templates.subject IS 'Email subject line (supports {{variables}})';
COMMENT ON COLUMN linksy_host_email_templates.body_html IS 'Email body HTML (supports {{variables}})';
COMMENT ON COLUMN linksy_host_email_templates.variables IS 'Available template variables (e.g., provider_name, client_name, custom_fields)';
COMMENT ON COLUMN linksy_host_email_templates.is_active IS 'Whether to use this template (false = use system default)';

-- Index for efficient lookups
CREATE INDEX idx_host_email_templates_host_key
ON linksy_host_email_templates(host_id, template_key)
WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_host_email_templates_updated_at
  BEFORE UPDATE ON linksy_host_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Site admins and host admins can manage templates
ALTER TABLE linksy_host_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site admins can manage all host email templates"
ON linksy_host_email_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'site_admin'
  )
);

CREATE POLICY "Host admins can manage their own email templates"
ON linksy_host_email_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM linksy_provider_contacts
    WHERE linksy_provider_contacts.provider_id = host_id
    AND linksy_provider_contacts.user_id = auth.uid()
    AND linksy_provider_contacts.status = 'active'
    AND linksy_provider_contacts.contact_type IN ('provider_admin', 'org_admin')
  )
);

-- Seed default template keys with descriptions
INSERT INTO linksy_docs (
  title,
  slug,
  content,
  excerpt,
  category,
  min_role,
  is_published,
  sort_order
) VALUES (
  'Host Email Template Variables',
  'host-email-template-variables',
  E'# Available Template Variables

## Common Variables (All Templates)
- `{{host_name}}` - Host organization name
- `{{host_website}}` - Host website URL
- `{{host_phone}}` - Host phone number
- `{{host_email}}` - Host email address

## new_referral_to_provider
Sent to provider when new referral is created via host widget.

**Variables:**
- `{{provider_name}}` - Provider organization name
- `{{client_name}}` - Client name
- `{{client_email}}` - Client email
- `{{client_phone}}` - Client phone
- `{{need_category}}` - Need category name
- `{{need_name}}` - Specific need name
- `{{description}}` - Client description of need
- `{{custom_fields}}` - Formatted custom field responses (if any)
- `{{ticket_number}}` - Referral ticket number
- `{{ticket_url}}` - Link to view ticket in dashboard

## referral_status_update
Sent to client when referral status changes.

**Variables:**
- `{{client_name}}` - Client name
- `{{provider_name}}` - Provider organization name
- `{{old_status}}` - Previous status
- `{{new_status}}` - New status
- `{{ticket_number}}` - Referral ticket number
- `{{message}}` - Optional message from provider

## custom_form_submission
Sent to host when custom intake form is submitted (optional).

**Variables:**
- `{{client_name}}` - Client name
- `{{client_email}}` - Client email
- `{{custom_fields}}` - Formatted custom field responses
- `{{submission_date}}` - Date/time of submission',
  'Reference guide for email template variables available to host administrators',
  'documentation',
  'site_admin',
  true,
  100
) ON CONFLICT (slug) DO NOTHING;


-- ************************************************************
-- Migration: 20260224160100_create_host_custom_fields.sql
-- ************************************************************

-- Host custom intake form fields
-- Allows hosts to add custom questions before referral submission

CREATE TABLE IF NOT EXISTS linksy_host_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  field_label VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'checkbox', 'date', 'email', 'phone')),
  field_options TEXT[] DEFAULT '{}',
  placeholder VARCHAR(200),
  help_text VARCHAR(500),
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE linksy_host_custom_fields IS 'Custom intake form fields configured by hosts';
COMMENT ON COLUMN linksy_host_custom_fields.host_id IS 'Provider that owns this field (must be a host)';
COMMENT ON COLUMN linksy_host_custom_fields.field_label IS 'Label displayed to user (e.g., "How did you hear about us?")';
COMMENT ON COLUMN linksy_host_custom_fields.field_type IS 'Input type: text, textarea, select, checkbox, date, email, phone';
COMMENT ON COLUMN linksy_host_custom_fields.field_options IS 'Options for select fields (e.g., ["Option 1", "Option 2"])';
COMMENT ON COLUMN linksy_host_custom_fields.placeholder IS 'Placeholder text for input fields';
COMMENT ON COLUMN linksy_host_custom_fields.help_text IS 'Helper text shown below field';
COMMENT ON COLUMN linksy_host_custom_fields.is_required IS 'Whether field must be filled before submission';
COMMENT ON COLUMN linksy_host_custom_fields.sort_order IS 'Display order (lower = shown first)';
COMMENT ON COLUMN linksy_host_custom_fields.is_active IS 'Whether to show this field in the form';

-- Index for efficient lookups
CREATE INDEX idx_host_custom_fields_host_active
ON linksy_host_custom_fields(host_id, is_active, sort_order)
WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_host_custom_fields_updated_at
  BEFORE UPDATE ON linksy_host_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Site admins and host admins can manage fields
ALTER TABLE linksy_host_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site admins can manage all host custom fields"
ON linksy_host_custom_fields
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'site_admin'
  )
);

CREATE POLICY "Host admins can manage their own custom fields"
ON linksy_host_custom_fields
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM linksy_provider_contacts
    WHERE linksy_provider_contacts.provider_id = host_id
    AND linksy_provider_contacts.user_id = auth.uid()
    AND linksy_provider_contacts.status = 'active'
    AND linksy_provider_contacts.contact_type IN ('provider_admin', 'org_admin')
  )
);

-- Public read for active fields (widget needs to fetch them)
CREATE POLICY "Anyone can read active host custom fields"
ON linksy_host_custom_fields
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Add custom_data JSONB column to linksy_tickets to store responses
ALTER TABLE linksy_tickets
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN linksy_tickets.custom_data IS 'Custom field responses from host intake form (key-value pairs)';

-- Index for querying custom data
CREATE INDEX IF NOT EXISTS idx_tickets_custom_data
ON linksy_tickets USING GIN (custom_data);


-- ************************************************************
-- Migration: 20260224170000_create_ticket_reassignment_system.sql
-- ************************************************************

-- Migration: Create Ticket Reassignment System
-- Creates event table for audit trail + extends tickets table with assignment fields

-- ================================================================
-- 1. Create linksy_ticket_events table for comprehensive audit trail
-- ================================================================

CREATE TABLE IF NOT EXISTS linksy_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES linksy_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'assigned',
    'reassigned',
    'forwarded',
    'status_changed',
    'comment_added',
    'updated'
  )),

  -- Actor tracking
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type TEXT CHECK (actor_type IN ('site_admin', 'provider_admin', 'provider_contact', 'system')),

  -- State changes
  previous_state JSONB,
  new_state JSONB,

  -- Context
  reason TEXT CHECK (reason IS NULL OR reason IN (
    'unable_to_assist',
    'wrong_org',
    'capacity',
    'other',
    'admin_reassignment',
    'internal_assignment'
  )),
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ticket_events_ticket_id ON linksy_ticket_events(ticket_id);
CREATE INDEX idx_ticket_events_event_type ON linksy_ticket_events(event_type);
CREATE INDEX idx_ticket_events_created_at ON linksy_ticket_events(created_at DESC);
CREATE INDEX idx_ticket_events_actor_id ON linksy_ticket_events(actor_id);

COMMENT ON TABLE linksy_ticket_events IS 'Immutable audit trail for all ticket lifecycle events';
COMMENT ON COLUMN linksy_ticket_events.event_type IS 'Type of event: created, assigned, reassigned, forwarded, status_changed, comment_added, updated';
COMMENT ON COLUMN linksy_ticket_events.actor_id IS 'User who performed the action (null for system actions)';
COMMENT ON COLUMN linksy_ticket_events.actor_type IS 'Role of actor: site_admin, provider_admin, provider_contact, system';
COMMENT ON COLUMN linksy_ticket_events.previous_state IS 'JSON snapshot of relevant fields before change';
COMMENT ON COLUMN linksy_ticket_events.new_state IS 'JSON snapshot of relevant fields after change';
COMMENT ON COLUMN linksy_ticket_events.reason IS 'Categorized reason for action (for reassignments/forwards)';
COMMENT ON COLUMN linksy_ticket_events.notes IS 'Freeform explanation from actor';

-- ================================================================
-- 2. Extend linksy_tickets table with assignment fields
-- ================================================================

-- Add new assignment tracking fields
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reassignment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reassigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forwarded_from_provider_id UUID REFERENCES linksy_providers(id) ON DELETE SET NULL;

-- Indexes for assignment queries
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON linksy_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_reassignment_count ON linksy_tickets(reassignment_count);
CREATE INDEX IF NOT EXISTS idx_tickets_forwarded_from ON linksy_tickets(forwarded_from_provider_id);

COMMENT ON COLUMN linksy_tickets.assigned_to IS 'Current assignee (replaces overloaded client_user_id)';
COMMENT ON COLUMN linksy_tickets.assigned_at IS 'Timestamp of current assignment';
COMMENT ON COLUMN linksy_tickets.reassignment_count IS 'Number of times ticket reassigned between providers (not internal)';
COMMENT ON COLUMN linksy_tickets.last_reassigned_at IS 'Timestamp of most recent reassignment';
COMMENT ON COLUMN linksy_tickets.forwarded_from_provider_id IS 'Original provider when forwarded to admin pool';

-- ================================================================
-- 3. Backfill assigned_to from existing client_user_id
-- ================================================================

UPDATE linksy_tickets
SET
  assigned_to = client_user_id,
  assigned_at = created_at
WHERE client_user_id IS NOT NULL
  AND assigned_to IS NULL;

-- ================================================================
-- 4. Create initial "created" events for existing tickets
-- ================================================================

INSERT INTO linksy_ticket_events (
  ticket_id,
  event_type,
  actor_type,
  new_state,
  created_at
)
SELECT
  t.id,
  'created'::text,
  'system'::text,
  jsonb_build_object(
    'provider_id', t.provider_id,
    'assigned_to', t.assigned_to,
    'status', t.status
  ),
  t.created_at
FROM linksy_tickets t
WHERE NOT EXISTS (
  SELECT 1 FROM linksy_ticket_events e
  WHERE e.ticket_id = t.id AND e.event_type = 'created'
);

-- ================================================================
-- 5. RLS Policies for linksy_ticket_events
-- ================================================================

ALTER TABLE linksy_ticket_events ENABLE ROW LEVEL SECURITY;

-- Site admins can see all events
CREATE POLICY "Site admins can view all ticket events"
  ON linksy_ticket_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'site_admin'
    )
  );

-- Provider contacts can see events for their tickets
CREATE POLICY "Provider contacts can view their ticket events"
  ON linksy_ticket_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM linksy_tickets t
      JOIN linksy_provider_contacts pc ON pc.provider_id = t.provider_id
      WHERE t.id = ticket_id
        AND pc.user_id = auth.uid()
    )
  );

-- Only system can insert events (enforced at application layer)
CREATE POLICY "Service role can insert events"
  ON linksy_ticket_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- No updates allowed (append-only audit trail)
-- No DELETE policy (immutable)

-- ================================================================
-- 6. Helper function to record ticket events
-- ================================================================

CREATE OR REPLACE FUNCTION linksy_record_ticket_event(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO linksy_ticket_events (
    ticket_id,
    event_type,
    actor_id,
    actor_type,
    previous_state,
    new_state,
    reason,
    notes,
    metadata
  ) VALUES (
    p_ticket_id,
    p_event_type,
    p_actor_id,
    p_actor_type,
    p_previous_state,
    p_new_state,
    p_reason,
    p_notes,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION linksy_record_ticket_event IS 'Helper function to record ticket events with full context';

-- ================================================================
-- 7. Trigger to auto-create event on ticket status change
-- ================================================================

CREATE OR REPLACE FUNCTION linksy_ticket_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only record if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM linksy_record_ticket_event(
      p_ticket_id := NEW.id,
      p_event_type := 'status_changed',
      p_actor_type := 'system',
      p_previous_state := jsonb_build_object('status', OLD.status),
      p_new_state := jsonb_build_object('status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (only if not exists)
DROP TRIGGER IF EXISTS ticket_status_change_trigger ON linksy_tickets;
CREATE TRIGGER ticket_status_change_trigger
  AFTER UPDATE ON linksy_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION linksy_ticket_status_change_trigger();

COMMENT ON TRIGGER ticket_status_change_trigger ON linksy_tickets IS 'Auto-creates event when ticket status changes';


-- ************************************************************
-- Migration: 20260224200000_add_contact_email_fullname.sql
-- ************************************************************

-- Add email and full_name to provider contacts for invited users
-- These fields store contact info temporarily until the user account is created

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_provider_contacts_email
ON linksy_provider_contacts(email)
WHERE email IS NOT NULL;

-- Add constraint: must have either user_id OR email
ALTER TABLE linksy_provider_contacts
DROP CONSTRAINT IF EXISTS provider_contacts_user_or_email;

ALTER TABLE linksy_provider_contacts
ADD CONSTRAINT provider_contacts_user_or_email
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Backfill email and full_name from existing user records
UPDATE linksy_provider_contacts pc
SET
  email = u.email,
  full_name = u.full_name
FROM users u
WHERE pc.user_id = u.id
  AND pc.email IS NULL;

COMMENT ON COLUMN linksy_provider_contacts.email IS 'Email address for invited contacts without user accounts yet. Cleared when user_id is set.';
COMMENT ON COLUMN linksy_provider_contacts.full_name IS 'Full name for invited contacts without user accounts yet. Cleared when user_id is set.';


-- ************************************************************
-- Migration: 20260224201000_link_invited_users_to_contacts.sql
-- ************************************************************

-- Automatically link invited users to their provider contact when they sign up

CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email since we now have user_id
      full_name = NULL  -- Clear temporary full_name since we now have user_id
    WHERE id = v_contact_id
      AND user_id IS NULL;  -- Only update if not already linked

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email
      full_name = NULL  -- Clear temporary full_name
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status = 'invited';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.users table (after handle_new_user creates the record)
DROP TRIGGER IF EXISTS link_invited_user_trigger ON public.users;

CREATE TRIGGER link_invited_user_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION link_invited_user_to_contact();

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record when they sign up';


-- ************************************************************
-- Migration: 20260224230000_fix_contact_linking_trigger.sql
-- ************************************************************

-- Fix the contact linking trigger to run on auth.users instead of public.users
-- This gives us access to raw_user_meta_data which contains contact_id

DROP TRIGGER IF EXISTS link_invited_user_trigger ON public.users;

-- Recreate the trigger on auth.users (where it should have been)
DROP TRIGGER IF EXISTS link_invited_user_trigger ON auth.users;

CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get the user's email
  v_user_email := NEW.email;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email since we now have user_id
      full_name = NULL  -- Clear temporary full_name since we now have user_id
    WHERE id = v_contact_id
      AND user_id IS NULL;  -- Only update if not already linked

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,  -- Clear temporary email
      full_name = NULL  -- Clear temporary full_name
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status IN ('invited', 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table (BEFORE handle_new_user creates public.users record)
-- We run this AFTER INSERT so the auth user is fully created
CREATE TRIGGER link_invited_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_invited_user_to_contact();

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record when they sign up. Runs on auth.users to access raw_user_meta_data.';


-- ************************************************************
-- Migration: 20260224240000_link_providers_to_tenants.sql
-- ************************************************************

-- ============================================================================
-- LINK PROVIDERS TO TENANTS - ONE TENANT PER PROVIDER
-- ============================================================================
-- This migration creates a tenant for each provider organization and links
-- all provider contacts to their provider's tenant. This simplifies the
-- architecture and fixes loading issues for provider users.
-- ============================================================================

-- Step 1: Add tenant_id to linksy_providers table
ALTER TABLE linksy_providers
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_providers_tenant_id ON linksy_providers(tenant_id);

-- Step 2: Create a tenant for each existing provider and link them
DO $$
DECLARE
  provider_record RECORD;
  new_tenant_id UUID;
  tenant_slug TEXT;
  slug_counter INTEGER;
BEGIN
  FOR provider_record IN
    SELECT id, name, slug
    FROM linksy_providers
    WHERE tenant_id IS NULL
  LOOP
    -- Generate unique tenant slug (provider slug might conflict with existing tenants)
    tenant_slug := provider_record.slug;
    slug_counter := 1;

    -- Check if slug exists and make it unique
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = tenant_slug) LOOP
      tenant_slug := provider_record.slug || '-' || slug_counter;
      slug_counter := slug_counter + 1;
    END LOOP;

    -- Create tenant for this provider
    INSERT INTO tenants (name, slug, settings, branding)
    VALUES (
      provider_record.name,
      tenant_slug,
      jsonb_build_object(
        'type', 'provider_organization',
        'provider_id', provider_record.id
      ),
      '{}'::jsonb
    )
    RETURNING id INTO new_tenant_id;

    -- Link provider to tenant
    UPDATE linksy_providers
    SET tenant_id = new_tenant_id
    WHERE id = provider_record.id;

    RAISE NOTICE 'Created tenant % for provider %', new_tenant_id, provider_record.name;
  END LOOP;
END $$;

-- Step 3: Create tenant_users memberships for all existing provider contacts
DO $$
DECLARE
  contact_record RECORD;
  provider_tenant_id UUID;
  tenant_role TEXT;
BEGIN
  FOR contact_record IN
    SELECT
      pc.id,
      pc.user_id,
      pc.provider_id,
      pc.provider_role,
      pc.status,
      p.tenant_id,
      p.name as provider_name
    FROM linksy_provider_contacts pc
    JOIN linksy_providers p ON p.id = pc.provider_id
    WHERE pc.user_id IS NOT NULL
      AND pc.status = 'active'
      AND p.tenant_id IS NOT NULL
  LOOP
    -- Map provider_role to tenant_role
    tenant_role := CASE
      WHEN contact_record.provider_role = 'admin' THEN 'admin'
      ELSE 'member'
    END;

    -- Create tenant_users membership if it doesn't exist
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (
      contact_record.tenant_id,
      contact_record.user_id,
      tenant_role::tenant_role
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    RAISE NOTICE 'Created tenant membership for user % in provider % (tenant %)',
      contact_record.user_id, contact_record.provider_name, contact_record.tenant_id;
  END LOOP;
END $$;

-- Step 4: Update the contact linking trigger to also create tenant membership
CREATE OR REPLACE FUNCTION link_invited_user_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_provider_id UUID;
  v_tenant_id UUID;
  v_user_email TEXT;
  v_provider_role TEXT;
  v_tenant_role TEXT;
BEGIN
  -- Get the user's email
  v_user_email := NEW.email;

  -- Check if user was invited with contact metadata
  IF NEW.raw_user_meta_data ? 'contact_id' THEN
    v_contact_id := (NEW.raw_user_meta_data->>'contact_id')::UUID;

    -- Get provider_id, tenant_id, and provider_role from contact
    SELECT provider_id, provider_role
    INTO v_provider_id, v_provider_role
    FROM linksy_provider_contacts
    WHERE id = v_contact_id;

    -- Get tenant_id from provider
    SELECT tenant_id INTO v_tenant_id
    FROM linksy_providers
    WHERE id = v_provider_id;

    -- Update the contact to link to this user and mark as accepted
    UPDATE linksy_provider_contacts
    SET
      user_id = NEW.id,
      invitation_accepted_at = NOW(),
      status = 'active',
      email = NULL,
      full_name = NULL
    WHERE id = v_contact_id
      AND user_id IS NULL;

    -- Create tenant membership if provider has a tenant
    IF v_tenant_id IS NOT NULL THEN
      v_tenant_role := CASE
        WHEN v_provider_role = 'admin' THEN 'admin'
        ELSE 'member'
      END;

      INSERT INTO tenant_users (tenant_id, user_id, role)
      VALUES (v_tenant_id, NEW.id, v_tenant_role::tenant_role)
      ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
    END IF;

  -- Or check if there's a contact with matching email waiting for this user
  ELSIF v_user_email IS NOT NULL THEN
    -- Try to find a contact with this email but no user_id
    SELECT id, provider_id, provider_role
    INTO v_contact_id, v_provider_id, v_provider_role
    FROM linksy_provider_contacts
    WHERE email = v_user_email
      AND user_id IS NULL
      AND status IN ('invited', 'pending')
    LIMIT 1;

    IF v_contact_id IS NOT NULL THEN
      -- Get tenant_id from provider
      SELECT tenant_id INTO v_tenant_id
      FROM linksy_providers
      WHERE id = v_provider_id;

      -- Update contact
      UPDATE linksy_provider_contacts
      SET
        user_id = NEW.id,
        invitation_accepted_at = NOW(),
        status = 'active',
        email = NULL,
        full_name = NULL
      WHERE id = v_contact_id;

      -- Create tenant membership if provider has a tenant
      IF v_tenant_id IS NOT NULL THEN
        v_tenant_role := CASE
          WHEN v_provider_role = 'admin' THEN 'admin'
          ELSE 'member'
        END;

        INSERT INTO tenant_users (tenant_id, user_id, role)
        VALUES (v_tenant_id, NEW.id, v_tenant_role::tenant_role)
        ON CONFLICT (tenant_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_invited_user_to_contact() IS 'Automatically links invited users to their provider contact record AND creates tenant membership when they sign up.';

COMMENT ON COLUMN linksy_providers.tenant_id IS 'Each provider organization has its own tenant for workspace management';


-- ************************************************************
-- Migration: 20260225204403_remote_schema.sql
-- ************************************************************

drop extension if exists "pg_net";

create extension if not exists "btree_gin" with schema "public";

create type "public"."api_key_status" as enum ('active', 'revoked', 'expired');

create type "public"."billing_period" as enum ('monthly', 'yearly');

create type "public"."custom_field_type" as enum ('text', 'number', 'date', 'dropdown', 'checkbox', 'file');

create type "public"."email_frequency" as enum ('instant', 'daily_digest', 'off');

create type "public"."entity_type" as enum ('user', 'location', 'module_data');

create type "public"."feature_flag_type" as enum ('boolean', 'rollout_percentage', 'tenant_whitelist');

create type "public"."invoice_status" as enum ('draft', 'open', 'paid', 'void', 'uncollectible');

create type "public"."job_status" as enum ('pending', 'running', 'completed', 'failed');

create type "public"."subscription_status" as enum ('trial', 'active', 'past_due', 'cancelled');

create type "public"."tenant_status" as enum ('trial', 'active', 'suspended', 'cancelled', 'archived');

create type "public"."tenant_type" as enum ('enterprise', 'nonprofit', 'church', 'individual', 'other');

create type "public"."theme_preference" as enum ('light', 'dark', 'system');

create type "public"."webhook_delivery_status" as enum ('pending', 'delivered', 'failed');

drop trigger if exists "update_linksy_email_templates_updated_at" on "public"."linksy_email_templates";

drop trigger if exists "update_host_custom_fields_updated_at" on "public"."linksy_host_custom_fields";

drop trigger if exists "update_host_email_templates_updated_at" on "public"."linksy_host_email_templates";

drop trigger if exists "ticket_status_change_trigger" on "public"."linksy_tickets";

drop trigger if exists "update_linksy_webhooks_updated_at" on "public"."linksy_webhooks";

drop trigger if exists "update_sites_updated_at" on "public"."sites";

drop policy "Tenant admins can view their tenant audit logs" on "public"."audit_logs";

drop policy "Tenant admins can delete any file in their tenant" on "public"."files";

drop policy "Users can delete their own files" on "public"."files";

drop policy "Users can upload files to their tenants" on "public"."files";

drop policy "Users can view files in their tenants" on "public"."files";

drop policy "Tenant admins can create invitations" on "public"."invitations";

drop policy "Tenant admins can delete invitations" on "public"."invitations";

drop policy "Tenant admins can view their invitations" on "public"."invitations";

drop policy "Anyone can read active host custom fields" on "public"."linksy_host_custom_fields";

drop policy "Host admins can manage their own custom fields" on "public"."linksy_host_custom_fields";

drop policy "Site admins can manage all host custom fields" on "public"."linksy_host_custom_fields";

drop policy "Host admins can manage their own email templates" on "public"."linksy_host_email_templates";

drop policy "Site admins can manage all host email templates" on "public"."linksy_host_email_templates";

drop policy "Provider contacts can view their ticket events" on "public"."linksy_ticket_events";

drop policy "Service role can insert events" on "public"."linksy_ticket_events";

drop policy "Site admins can view all ticket events" on "public"."linksy_ticket_events";

drop policy "Admins can view webhook deliveries" on "public"."linksy_webhook_deliveries";

drop policy "System can create webhook deliveries" on "public"."linksy_webhook_deliveries";

drop policy "Admins can create tenant webhooks" on "public"."linksy_webhooks";

drop policy "Admins can delete tenant webhooks" on "public"."linksy_webhooks";

drop policy "Admins can update tenant webhooks" on "public"."linksy_webhooks";

drop policy "Admins can view tenant webhooks" on "public"."linksy_webhooks";

drop policy "Users can update their own notifications" on "public"."notifications";

drop policy "Users can view their own notifications" on "public"."notifications";

drop policy "Tenant admins can manage their tenant modules" on "public"."tenant_modules";

drop policy "Tenant admins can manage their tenant memberships" on "public"."tenant_users";

drop policy "Tenant admins can view their tenant memberships" on "public"."tenant_users";

drop policy "Users can view their own memberships" on "public"."tenant_users";

drop policy "Tenant admins can update their tenant" on "public"."tenants";

drop policy "Users can view other users in their tenants" on "public"."users";

revoke delete on table "public"."linksy_host_custom_fields" from "anon";

revoke insert on table "public"."linksy_host_custom_fields" from "anon";

revoke references on table "public"."linksy_host_custom_fields" from "anon";

revoke select on table "public"."linksy_host_custom_fields" from "anon";

revoke trigger on table "public"."linksy_host_custom_fields" from "anon";

revoke truncate on table "public"."linksy_host_custom_fields" from "anon";

revoke update on table "public"."linksy_host_custom_fields" from "anon";

revoke delete on table "public"."linksy_host_custom_fields" from "authenticated";

revoke insert on table "public"."linksy_host_custom_fields" from "authenticated";

revoke references on table "public"."linksy_host_custom_fields" from "authenticated";

revoke select on table "public"."linksy_host_custom_fields" from "authenticated";

revoke trigger on table "public"."linksy_host_custom_fields" from "authenticated";

revoke truncate on table "public"."linksy_host_custom_fields" from "authenticated";

revoke update on table "public"."linksy_host_custom_fields" from "authenticated";

revoke delete on table "public"."linksy_host_custom_fields" from "service_role";

revoke insert on table "public"."linksy_host_custom_fields" from "service_role";

revoke references on table "public"."linksy_host_custom_fields" from "service_role";

revoke select on table "public"."linksy_host_custom_fields" from "service_role";

revoke trigger on table "public"."linksy_host_custom_fields" from "service_role";

revoke truncate on table "public"."linksy_host_custom_fields" from "service_role";

revoke update on table "public"."linksy_host_custom_fields" from "service_role";

revoke delete on table "public"."linksy_host_email_templates" from "anon";

revoke insert on table "public"."linksy_host_email_templates" from "anon";

revoke references on table "public"."linksy_host_email_templates" from "anon";

revoke select on table "public"."linksy_host_email_templates" from "anon";

revoke trigger on table "public"."linksy_host_email_templates" from "anon";

revoke truncate on table "public"."linksy_host_email_templates" from "anon";

revoke update on table "public"."linksy_host_email_templates" from "anon";

revoke delete on table "public"."linksy_host_email_templates" from "authenticated";

revoke insert on table "public"."linksy_host_email_templates" from "authenticated";

revoke references on table "public"."linksy_host_email_templates" from "authenticated";

revoke select on table "public"."linksy_host_email_templates" from "authenticated";

revoke trigger on table "public"."linksy_host_email_templates" from "authenticated";

revoke truncate on table "public"."linksy_host_email_templates" from "authenticated";

revoke update on table "public"."linksy_host_email_templates" from "authenticated";

revoke delete on table "public"."linksy_host_email_templates" from "service_role";

revoke insert on table "public"."linksy_host_email_templates" from "service_role";

revoke references on table "public"."linksy_host_email_templates" from "service_role";

revoke select on table "public"."linksy_host_email_templates" from "service_role";

revoke trigger on table "public"."linksy_host_email_templates" from "service_role";

revoke truncate on table "public"."linksy_host_email_templates" from "service_role";

revoke update on table "public"."linksy_host_email_templates" from "service_role";

revoke delete on table "public"."linksy_ticket_events" from "anon";

revoke insert on table "public"."linksy_ticket_events" from "anon";

revoke references on table "public"."linksy_ticket_events" from "anon";

revoke select on table "public"."linksy_ticket_events" from "anon";

revoke trigger on table "public"."linksy_ticket_events" from "anon";

revoke truncate on table "public"."linksy_ticket_events" from "anon";

revoke update on table "public"."linksy_ticket_events" from "anon";

revoke delete on table "public"."linksy_ticket_events" from "authenticated";

revoke insert on table "public"."linksy_ticket_events" from "authenticated";

revoke references on table "public"."linksy_ticket_events" from "authenticated";

revoke select on table "public"."linksy_ticket_events" from "authenticated";

revoke trigger on table "public"."linksy_ticket_events" from "authenticated";

revoke truncate on table "public"."linksy_ticket_events" from "authenticated";

revoke update on table "public"."linksy_ticket_events" from "authenticated";

revoke delete on table "public"."linksy_ticket_events" from "service_role";

revoke insert on table "public"."linksy_ticket_events" from "service_role";

revoke references on table "public"."linksy_ticket_events" from "service_role";

revoke select on table "public"."linksy_ticket_events" from "service_role";

revoke trigger on table "public"."linksy_ticket_events" from "service_role";

revoke truncate on table "public"."linksy_ticket_events" from "service_role";

revoke update on table "public"."linksy_ticket_events" from "service_role";

revoke delete on table "public"."linksy_webhook_deliveries" from "anon";

revoke insert on table "public"."linksy_webhook_deliveries" from "anon";

revoke references on table "public"."linksy_webhook_deliveries" from "anon";

revoke select on table "public"."linksy_webhook_deliveries" from "anon";

revoke trigger on table "public"."linksy_webhook_deliveries" from "anon";

revoke truncate on table "public"."linksy_webhook_deliveries" from "anon";

revoke update on table "public"."linksy_webhook_deliveries" from "anon";

revoke delete on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke insert on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke references on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke select on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke trigger on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke truncate on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke update on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke delete on table "public"."linksy_webhook_deliveries" from "service_role";

revoke insert on table "public"."linksy_webhook_deliveries" from "service_role";

revoke references on table "public"."linksy_webhook_deliveries" from "service_role";

revoke select on table "public"."linksy_webhook_deliveries" from "service_role";

revoke trigger on table "public"."linksy_webhook_deliveries" from "service_role";

revoke truncate on table "public"."linksy_webhook_deliveries" from "service_role";

revoke update on table "public"."linksy_webhook_deliveries" from "service_role";

revoke delete on table "public"."linksy_webhooks" from "anon";

revoke insert on table "public"."linksy_webhooks" from "anon";

revoke references on table "public"."linksy_webhooks" from "anon";

revoke select on table "public"."linksy_webhooks" from "anon";

revoke trigger on table "public"."linksy_webhooks" from "anon";

revoke truncate on table "public"."linksy_webhooks" from "anon";

revoke update on table "public"."linksy_webhooks" from "anon";

revoke delete on table "public"."linksy_webhooks" from "authenticated";

revoke insert on table "public"."linksy_webhooks" from "authenticated";

revoke references on table "public"."linksy_webhooks" from "authenticated";

revoke select on table "public"."linksy_webhooks" from "authenticated";

revoke trigger on table "public"."linksy_webhooks" from "authenticated";

revoke truncate on table "public"."linksy_webhooks" from "authenticated";

revoke update on table "public"."linksy_webhooks" from "authenticated";

revoke delete on table "public"."linksy_webhooks" from "service_role";

revoke insert on table "public"."linksy_webhooks" from "service_role";

revoke references on table "public"."linksy_webhooks" from "service_role";

revoke select on table "public"."linksy_webhooks" from "service_role";

revoke trigger on table "public"."linksy_webhooks" from "service_role";

revoke truncate on table "public"."linksy_webhooks" from "service_role";

revoke update on table "public"."linksy_webhooks" from "service_role";

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_created_by_fkey";

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_field_type_check";

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_host_id_fkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_created_by_fkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_host_id_fkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_host_id_template_key_key";

-- PRESERVED: linksy_providers_tenant_id_fkey needed by region tenant model
-- alter table "public"."linksy_providers" drop constraint "linksy_providers_tenant_id_fkey";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_actor_id_fkey";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_actor_type_check";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_event_type_check";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_reason_check";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_ticket_id_fkey";

alter table "public"."linksy_tickets" drop constraint "linksy_tickets_assigned_to_fkey";

alter table "public"."linksy_tickets" drop constraint "linksy_tickets_forwarded_from_provider_id_fkey";

alter table "public"."linksy_webhook_deliveries" drop constraint "linksy_webhook_deliveries_webhook_id_fkey";

alter table "public"."linksy_webhooks" drop constraint "linksy_webhooks_created_by_fkey";

-- PRESERVED: linksy_webhooks_tenant_id_fkey needed by region tenant model
-- alter table "public"."linksy_webhooks" drop constraint "linksy_webhooks_tenant_id_fkey";

alter table "public"."sites" drop constraint "sites_slug_key";

alter table "public"."linksy_provider_contacts" drop constraint "linksy_provider_contacts_status_check";

drop function if exists "public"."linksy_record_ticket_event"(p_ticket_id uuid, p_event_type text, p_actor_id uuid, p_actor_type text, p_previous_state jsonb, p_new_state jsonb, p_reason text, p_notes text, p_metadata jsonb);

drop function if exists "public"."linksy_ticket_status_change_trigger"();

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_pkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_pkey";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_pkey";

alter table "public"."linksy_webhook_deliveries" drop constraint "linksy_webhook_deliveries_pkey";

alter table "public"."linksy_webhooks" drop constraint "linksy_webhooks_pkey";

drop index if exists "public"."idx_audit_logs_created_at";

drop index if exists "public"."idx_host_custom_fields_host_active";

drop index if exists "public"."idx_host_email_templates_host_key";

drop index if exists "public"."idx_invitations_email";

drop index if exists "public"."idx_linksy_email_templates_active";

drop index if exists "public"."idx_linksy_webhook_deliveries_created_at";

drop index if exists "public"."idx_linksy_webhook_deliveries_success";

drop index if exists "public"."idx_linksy_webhook_deliveries_webhook_id";

drop index if exists "public"."idx_linksy_webhooks_is_active";

-- PRESERVED: idx_linksy_webhooks_tenant_id needed by region tenant model
-- drop index if exists "public"."idx_linksy_webhooks_tenant_id";

-- PRESERVED: idx_providers_tenant_id needed by region tenant model
-- drop index if exists "public"."idx_providers_tenant_id";

drop index if exists "public"."idx_ticket_events_actor_id";

drop index if exists "public"."idx_ticket_events_created_at";

drop index if exists "public"."idx_ticket_events_event_type";

drop index if exists "public"."idx_ticket_events_ticket_id";

drop index if exists "public"."idx_tickets_assigned_to";

drop index if exists "public"."idx_tickets_custom_data";

drop index if exists "public"."idx_tickets_forwarded_from";

drop index if exists "public"."idx_tickets_reassignment_count";

drop index if exists "public"."linksy_host_custom_fields_pkey";

drop index if exists "public"."linksy_host_email_templates_host_id_template_key_key";

drop index if exists "public"."linksy_host_email_templates_pkey";

drop index if exists "public"."linksy_ticket_events_pkey";

drop index if exists "public"."linksy_webhook_deliveries_pkey";

drop index if exists "public"."linksy_webhooks_pkey";

drop index if exists "public"."sites_slug_key";

drop table "public"."linksy_host_custom_fields";

drop table "public"."linksy_host_email_templates";

drop table "public"."linksy_ticket_events";

drop table "public"."linksy_webhook_deliveries";

drop table "public"."linksy_webhooks";

alter table "public"."linksy_provider_contacts" alter column "contact_type" drop default;

alter type "public"."linksy_contact_type" rename to "linksy_contact_type__old_version_to_be_dropped";

create type "public"."linksy_contact_type" as enum ('customer', 'provider_employee');


  create table "public"."activity_feed" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "user_id" uuid not null,
    "action_type" text not null,
    "resource_type" text,
    "resource_id" uuid,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."activity_feed" enable row level security;


  create table "public"."api_key_logs" (
    "id" uuid not null default gen_random_uuid(),
    "api_key_id" uuid not null,
    "endpoint" text not null,
    "method" text not null,
    "status_code" integer,
    "response_time_ms" integer,
    "ip_address" inet,
    "user_agent" text,
    "error_message" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."api_key_logs" enable row level security;


  create table "public"."api_keys" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "key_hash" text not null,
    "key_prefix" text not null,
    "name" text not null,
    "scopes" jsonb default '[]'::jsonb,
    "rate_limit" integer default 100,
    "allowed_domains" jsonb default '[]'::jsonb,
    "status" public.api_key_status default 'active'::public.api_key_status,
    "revoked_at" timestamp with time zone,
    "revoked_reason" text,
    "grace_period_ends_at" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."api_keys" enable row level security;


  create table "public"."background_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "job_type" text not null,
    "payload" jsonb not null,
    "status" public.job_status default 'pending'::public.job_status,
    "scheduled_for" timestamp with time zone default now(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" text,
    "retry_count" integer default 0,
    "max_retries" integer default 3,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."background_jobs" enable row level security;


  create table "public"."company_modules" (
    "company_id" uuid not null,
    "module_id" uuid not null,
    "enabled" boolean default true,
    "settings" jsonb default '{}'::jsonb,
    "enabled_at" timestamp with time zone default now(),
    "enabled_by" uuid
      );


alter table "public"."company_modules" enable row level security;


  create table "public"."custom_field_definitions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "entity_type" public.entity_type not null,
    "module_id" uuid,
    "field_name" text not null,
    "field_label" text not null,
    "field_type" public.custom_field_type not null,
    "options" jsonb,
    "is_required" boolean default false,
    "display_order" integer default 0,
    "validation_rules" jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."custom_field_definitions" enable row level security;


  create table "public"."custom_field_values" (
    "id" uuid not null default gen_random_uuid(),
    "field_id" uuid not null,
    "entity_id" uuid not null,
    "value" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."custom_field_values" enable row level security;


  create table "public"."event_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "module_id" uuid,
    "event_type" text not null,
    "handler_function" text not null,
    "enabled" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."event_subscriptions" enable row level security;


  create table "public"."feature_flags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "flag_type" public.feature_flag_type default 'boolean'::public.feature_flag_type,
    "enabled_globally" boolean default false,
    "rollout_percentage" integer default 0,
    "enabled_for_tenants" jsonb default '[]'::jsonb,
    "enabled_for_users" jsonb default '[]'::jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."feature_flags" enable row level security;


  create table "public"."file_versions" (
    "id" uuid not null default gen_random_uuid(),
    "file_id" uuid not null,
    "version_number" integer not null,
    "storage_path" text not null,
    "uploaded_by" uuid not null,
    "file_size" bigint not null,
    "uploaded_at" timestamp with time zone default now()
      );


alter table "public"."file_versions" enable row level security;


  create table "public"."invoices" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "subscription_id" uuid,
    "amount_due" numeric(10,2) not null,
    "amount_paid" numeric(10,2) default 0,
    "status" public.invoice_status default 'draft'::public.invoice_status,
    "due_date" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "external_invoice_id" text,
    "line_items" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."invoices" enable row level security;


  create table "public"."locations" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "name" text not null,
    "address" jsonb,
    "settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "search_vector" tsvector
      );


alter table "public"."locations" enable row level security;


  create table "public"."rate_limit_usage" (
    "tenant_id" uuid not null,
    "metric_type" text not null,
    "window_start" timestamp with time zone not null,
    "count" integer default 0
      );


alter table "public"."rate_limit_usage" enable row level security;


  create table "public"."subscription_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site_id" uuid not null,
    "name" text not null,
    "billing_period" public.billing_period not null,
    "base_price" numeric(10,2) not null,
    "included_seats" integer default 1,
    "price_per_additional_seat" numeric(10,2),
    "included_modules" jsonb default '[]'::jsonb,
    "features" jsonb default '{}'::jsonb,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."subscription_plans" enable row level security;


  create table "public"."system_events" (
    "id" uuid not null default gen_random_uuid(),
    "event_type" text not null,
    "payload" jsonb not null,
    "triggered_at" timestamp with time zone default now()
      );


alter table "public"."system_events" enable row level security;


  create table "public"."tenant_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "plan_id" uuid,
    "status" public.subscription_status default 'trial'::public.subscription_status,
    "trial_ends_at" timestamp with time zone,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean default false,
    "external_subscription_id" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."tenant_subscriptions" enable row level security;


  create table "public"."usage_records" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "metric_type" text not null,
    "quantity" integer not null,
    "recorded_at" timestamp with time zone default now()
      );


alter table "public"."usage_records" enable row level security;


  create table "public"."user_locations" (
    "user_id" uuid not null,
    "location_id" uuid not null,
    "tenant_id" uuid not null,
    "is_location_admin" boolean default false,
    "assigned_at" timestamp with time zone default now(),
    "assigned_by" uuid
      );


alter table "public"."user_locations" enable row level security;


  create table "public"."user_module_permissions" (
    "user_id" uuid not null,
    "module_id" uuid not null,
    "company_id" uuid not null,
    "can_admin" boolean default false,
    "custom_permissions" jsonb default '{}'::jsonb,
    "granted_at" timestamp with time zone default now(),
    "granted_by" uuid
      );


alter table "public"."user_module_permissions" enable row level security;


  create table "public"."webhook_deliveries" (
    "id" uuid not null default gen_random_uuid(),
    "webhook_id" uuid not null,
    "event_id" uuid,
    "status" public.webhook_delivery_status default 'pending'::public.webhook_delivery_status,
    "response_code" integer,
    "response_body" text,
    "delivered_at" timestamp with time zone,
    "retry_count" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."webhook_deliveries" enable row level security;


  create table "public"."webhook_endpoints" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "url" text not null,
    "secret" text not null,
    "events" jsonb default '[]'::jsonb,
    "enabled" boolean default true,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."webhook_endpoints" enable row level security;

alter table "public"."linksy_provider_contacts" alter column contact_type type "public"."linksy_contact_type" using contact_type::text::"public"."linksy_contact_type";

alter table "public"."linksy_provider_contacts" alter column "contact_type" set default 'provider_employee'::public.linksy_contact_type;

drop type "public"."linksy_contact_type__old_version_to_be_dropped";

alter table "public"."files" drop column "path";

alter table "public"."files" add column "folder_path" text;

alter table "public"."files" add column "is_shared" boolean default false;

alter table "public"."files" add column "module_id" character varying(50);

alter table "public"."files" add column "storage_path" text not null;

alter table "public"."files" add column "updated_at" timestamp with time zone default now();

alter table "public"."files" add column "uploaded_by" uuid;

-- PRESERVED: tenant_id column needed by region tenant model (20260225223000)
-- alter table "public"."linksy_providers" drop column "tenant_id";

alter table "public"."linksy_tickets" drop column "assigned_at";

alter table "public"."linksy_tickets" drop column "assigned_to";

alter table "public"."linksy_tickets" drop column "custom_data";

alter table "public"."linksy_tickets" drop column "forwarded_from_provider_id";

alter table "public"."linksy_tickets" drop column "last_reassigned_at";

alter table "public"."linksy_tickets" drop column "reassignment_count";

alter table "public"."sites" drop column "is_active";

alter table "public"."sites" drop column "slug";

alter table "public"."sites" add column "domain" text;

alter table "public"."sites" add column "settings" jsonb default '{}'::jsonb;

alter table "public"."sites" alter column "id" set default gen_random_uuid();

alter table "public"."sites" enable row level security;

alter table "public"."users" add column "email_notifications" boolean default true;

alter table "public"."users" add column "language" character varying(10);

alter table "public"."users" add column "push_notifications" boolean default true;

alter table "public"."users" add column "theme" character varying(20);

alter table "public"."users" add column "timezone" character varying(100);

CREATE UNIQUE INDEX activity_feed_pkey ON public.activity_feed USING btree (id);

CREATE UNIQUE INDEX api_key_logs_pkey ON public.api_key_logs USING btree (id);

CREATE UNIQUE INDEX api_keys_key_hash_key ON public.api_keys USING btree (key_hash);

CREATE UNIQUE INDEX api_keys_pkey ON public.api_keys USING btree (id);

CREATE UNIQUE INDEX background_jobs_pkey ON public.background_jobs USING btree (id);

CREATE UNIQUE INDEX company_modules_pkey ON public.company_modules USING btree (company_id, module_id);

CREATE UNIQUE INDEX custom_field_definitions_pkey ON public.custom_field_definitions USING btree (id);

CREATE UNIQUE INDEX custom_field_values_pkey ON public.custom_field_values USING btree (id);

CREATE UNIQUE INDEX event_subscriptions_pkey ON public.event_subscriptions USING btree (id);

CREATE UNIQUE INDEX feature_flags_name_key ON public.feature_flags USING btree (name);

CREATE UNIQUE INDEX feature_flags_pkey ON public.feature_flags USING btree (id);

CREATE UNIQUE INDEX file_versions_file_id_version_number_key ON public.file_versions USING btree (file_id, version_number);

CREATE UNIQUE INDEX file_versions_pkey ON public.file_versions USING btree (id);

CREATE INDEX idx_activity_feed_created_at ON public.activity_feed USING btree (created_at DESC);

CREATE INDEX idx_activity_feed_tenant_id ON public.activity_feed USING btree (tenant_id);

CREATE INDEX idx_activity_feed_user_id ON public.activity_feed USING btree (user_id);

CREATE INDEX idx_api_key_logs_created_at ON public.api_key_logs USING btree (created_at);

CREATE INDEX idx_api_key_logs_key_id ON public.api_key_logs USING btree (api_key_id);

CREATE INDEX idx_api_keys_key_prefix ON public.api_keys USING btree (key_prefix);

CREATE INDEX idx_api_keys_status ON public.api_keys USING btree (status);

CREATE INDEX idx_api_keys_tenant_id ON public.api_keys USING btree (tenant_id);

CREATE INDEX idx_background_jobs_scheduled_for ON public.background_jobs USING btree (scheduled_for);

CREATE INDEX idx_background_jobs_status ON public.background_jobs USING btree (status);

CREATE INDEX idx_company_modules_company_id ON public.company_modules USING btree (company_id);

CREATE INDEX idx_company_modules_module_id ON public.company_modules USING btree (module_id);

CREATE INDEX idx_custom_field_values_entity_id ON public.custom_field_values USING btree (entity_id);

CREATE INDEX idx_custom_field_values_field_id ON public.custom_field_values USING btree (field_id);

CREATE INDEX idx_custom_fields_entity_type ON public.custom_field_definitions USING btree (entity_type);

CREATE INDEX idx_custom_fields_tenant_id ON public.custom_field_definitions USING btree (tenant_id);

CREATE INDEX idx_event_subscriptions_event_type ON public.event_subscriptions USING btree (event_type);

CREATE INDEX idx_feature_flags_name ON public.feature_flags USING btree (name);

CREATE INDEX idx_file_versions_file_id ON public.file_versions USING btree (file_id);

CREATE INDEX idx_files_is_shared ON public.files USING btree (is_shared);

CREATE INDEX idx_files_module_id ON public.files USING btree (module_id);

CREATE INDEX idx_files_uploaded_by ON public.files USING btree (uploaded_by);

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

CREATE INDEX idx_invoices_tenant_id ON public.invoices USING btree (tenant_id);

CREATE INDEX idx_locations_search ON public.locations USING gin (search_vector);

CREATE INDEX idx_locations_tenant_id ON public.locations USING btree (tenant_id);

CREATE INDEX idx_rate_limit_usage_window ON public.rate_limit_usage USING btree (window_start);

CREATE INDEX idx_system_events_event_type ON public.system_events USING btree (event_type);

CREATE INDEX idx_system_events_triggered_at ON public.system_events USING btree (triggered_at DESC);

CREATE INDEX idx_tenant_subscriptions_status ON public.tenant_subscriptions USING btree (status);

CREATE INDEX idx_tenant_subscriptions_tenant_id ON public.tenant_subscriptions USING btree (tenant_id);

CREATE INDEX idx_usage_records_metric_type ON public.usage_records USING btree (metric_type);

CREATE INDEX idx_usage_records_recorded_at ON public.usage_records USING btree (recorded_at);

CREATE INDEX idx_usage_records_tenant_id ON public.usage_records USING btree (tenant_id);

CREATE INDEX idx_user_locations_location_id ON public.user_locations USING btree (location_id);

CREATE INDEX idx_user_locations_user_id ON public.user_locations USING btree (user_id);

CREATE INDEX idx_user_module_permissions_module_id ON public.user_module_permissions USING btree (module_id);

CREATE INDEX idx_user_module_permissions_user_id ON public.user_module_permissions USING btree (user_id);

CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries USING btree (status);

CREATE INDEX idx_webhook_deliveries_webhook_id ON public.webhook_deliveries USING btree (webhook_id);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX rate_limit_usage_pkey ON public.rate_limit_usage USING btree (tenant_id, metric_type, window_start);

CREATE UNIQUE INDEX sites_domain_key ON public.sites USING btree (domain);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

CREATE UNIQUE INDEX system_events_pkey ON public.system_events USING btree (id);

CREATE UNIQUE INDEX tenant_subscriptions_pkey ON public.tenant_subscriptions USING btree (id);

CREATE UNIQUE INDEX unique_field_per_entity ON public.custom_field_definitions USING btree (tenant_id, entity_type, module_id, field_name);

CREATE UNIQUE INDEX usage_records_pkey ON public.usage_records USING btree (id);

CREATE UNIQUE INDEX user_locations_pkey ON public.user_locations USING btree (user_id, location_id);

CREATE UNIQUE INDEX user_module_permissions_pkey ON public.user_module_permissions USING btree (user_id, module_id, company_id);

CREATE UNIQUE INDEX webhook_deliveries_pkey ON public.webhook_deliveries USING btree (id);

CREATE UNIQUE INDEX webhook_endpoints_pkey ON public.webhook_endpoints USING btree (id);

alter table "public"."activity_feed" add constraint "activity_feed_pkey" PRIMARY KEY using index "activity_feed_pkey";

alter table "public"."api_key_logs" add constraint "api_key_logs_pkey" PRIMARY KEY using index "api_key_logs_pkey";

alter table "public"."api_keys" add constraint "api_keys_pkey" PRIMARY KEY using index "api_keys_pkey";

alter table "public"."background_jobs" add constraint "background_jobs_pkey" PRIMARY KEY using index "background_jobs_pkey";

alter table "public"."company_modules" add constraint "company_modules_pkey" PRIMARY KEY using index "company_modules_pkey";

alter table "public"."custom_field_definitions" add constraint "custom_field_definitions_pkey" PRIMARY KEY using index "custom_field_definitions_pkey";

alter table "public"."custom_field_values" add constraint "custom_field_values_pkey" PRIMARY KEY using index "custom_field_values_pkey";

alter table "public"."event_subscriptions" add constraint "event_subscriptions_pkey" PRIMARY KEY using index "event_subscriptions_pkey";

alter table "public"."feature_flags" add constraint "feature_flags_pkey" PRIMARY KEY using index "feature_flags_pkey";

alter table "public"."file_versions" add constraint "file_versions_pkey" PRIMARY KEY using index "file_versions_pkey";

alter table "public"."invoices" add constraint "invoices_pkey" PRIMARY KEY using index "invoices_pkey";

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."rate_limit_usage" add constraint "rate_limit_usage_pkey" PRIMARY KEY using index "rate_limit_usage_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."system_events" add constraint "system_events_pkey" PRIMARY KEY using index "system_events_pkey";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_pkey" PRIMARY KEY using index "tenant_subscriptions_pkey";

alter table "public"."usage_records" add constraint "usage_records_pkey" PRIMARY KEY using index "usage_records_pkey";

alter table "public"."user_locations" add constraint "user_locations_pkey" PRIMARY KEY using index "user_locations_pkey";

alter table "public"."user_module_permissions" add constraint "user_module_permissions_pkey" PRIMARY KEY using index "user_module_permissions_pkey";

alter table "public"."webhook_deliveries" add constraint "webhook_deliveries_pkey" PRIMARY KEY using index "webhook_deliveries_pkey";

alter table "public"."webhook_endpoints" add constraint "webhook_endpoints_pkey" PRIMARY KEY using index "webhook_endpoints_pkey";

alter table "public"."activity_feed" add constraint "activity_feed_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."activity_feed" validate constraint "activity_feed_user_id_fkey";

alter table "public"."api_key_logs" add constraint "api_key_logs_api_key_id_fkey" FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE not valid;

alter table "public"."api_key_logs" validate constraint "api_key_logs_api_key_id_fkey";

alter table "public"."api_keys" add constraint "api_keys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."api_keys" validate constraint "api_keys_created_by_fkey";

alter table "public"."api_keys" add constraint "api_keys_key_hash_key" UNIQUE using index "api_keys_key_hash_key";

alter table "public"."company_modules" add constraint "company_modules_enabled_by_fkey" FOREIGN KEY (enabled_by) REFERENCES auth.users(id) not valid;

alter table "public"."company_modules" validate constraint "company_modules_enabled_by_fkey";

alter table "public"."custom_field_definitions" add constraint "custom_field_definitions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."custom_field_definitions" validate constraint "custom_field_definitions_created_by_fkey";

alter table "public"."custom_field_definitions" add constraint "unique_field_per_entity" UNIQUE using index "unique_field_per_entity";

alter table "public"."custom_field_values" add constraint "custom_field_values_field_id_fkey" FOREIGN KEY (field_id) REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE not valid;

alter table "public"."custom_field_values" validate constraint "custom_field_values_field_id_fkey";

alter table "public"."feature_flags" add constraint "feature_flags_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."feature_flags" validate constraint "feature_flags_created_by_fkey";

alter table "public"."feature_flags" add constraint "feature_flags_name_key" UNIQUE using index "feature_flags_name_key";

alter table "public"."feature_flags" add constraint "feature_flags_rollout_percentage_check" CHECK (((rollout_percentage >= 0) AND (rollout_percentage <= 100))) not valid;

alter table "public"."feature_flags" validate constraint "feature_flags_rollout_percentage_check";

alter table "public"."file_versions" add constraint "file_versions_file_id_version_number_key" UNIQUE using index "file_versions_file_id_version_number_key";

alter table "public"."file_versions" add constraint "file_versions_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) not valid;

alter table "public"."file_versions" validate constraint "file_versions_uploaded_by_fkey";

alter table "public"."files" add constraint "files_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_uploaded_by_fkey";

alter table "public"."invoices" add constraint "invoices_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id) not valid;

alter table "public"."invoices" validate constraint "invoices_subscription_id_fkey";

alter table "public"."sites" add constraint "sites_domain_key" UNIQUE using index "sites_domain_key";

alter table "public"."subscription_plans" add constraint "subscription_plans_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."subscription_plans" validate constraint "subscription_plans_site_id_fkey";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) not valid;

alter table "public"."tenant_subscriptions" validate constraint "tenant_subscriptions_plan_id_fkey";

alter table "public"."user_locations" add constraint "user_locations_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_locations" validate constraint "user_locations_assigned_by_fkey";

alter table "public"."user_locations" add constraint "user_locations_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE not valid;

alter table "public"."user_locations" validate constraint "user_locations_location_id_fkey";

alter table "public"."user_locations" add constraint "user_locations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_locations" validate constraint "user_locations_user_id_fkey";

alter table "public"."user_module_permissions" add constraint "user_module_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_module_permissions" validate constraint "user_module_permissions_granted_by_fkey";

alter table "public"."user_module_permissions" add constraint "user_module_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_module_permissions" validate constraint "user_module_permissions_user_id_fkey";

alter table "public"."users" add constraint "users_theme_check" CHECK (((theme)::text = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying])::text[]))) not valid;

alter table "public"."users" validate constraint "users_theme_check";

alter table "public"."webhook_deliveries" add constraint "webhook_deliveries_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.system_events(id) not valid;

alter table "public"."webhook_deliveries" validate constraint "webhook_deliveries_event_id_fkey";

alter table "public"."webhook_deliveries" add constraint "webhook_deliveries_webhook_id_fkey" FOREIGN KEY (webhook_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE not valid;

alter table "public"."webhook_deliveries" validate constraint "webhook_deliveries_webhook_id_fkey";

alter table "public"."webhook_endpoints" add constraint "webhook_endpoints_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."webhook_endpoints" validate constraint "webhook_endpoints_created_by_fkey";

alter table "public"."linksy_provider_contacts" add constraint "linksy_provider_contacts_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'invited'::character varying, 'archived'::character varying, 'pending'::character varying])::text[]))) not valid;

alter table "public"."linksy_provider_contacts" validate constraint "linksy_provider_contacts_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_company_admin(uid uuid, tid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = uid AND tenant_id = tid 
    AND role IN ('company_admin', 'site_admin')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_site_admin(uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = uid AND role = 'site_admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    changes,
    ip_address
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    inet_client_addr()
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_file_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.file_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.folder_path, '')), 'B');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_files_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_location_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.address::text, '')), 'B');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_tenant_ids(uid uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT tenant_id FROM user_tenants WHERE user_id = uid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.belongs_to_tenant(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_id = tenant_uuid
        AND user_id = auth.uid()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_site_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'site_admin'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_id = tenant_uuid
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_invited_user_to_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_contact_id UUID;
    v_user_email TEXT;
    v_user_metadata JSONB;
  BEGIN
    -- Get the user's email and metadata from auth.users (not from NEW which is public.users)
    SELECT email, raw_user_meta_data
    INTO v_user_email, v_user_metadata
    FROM auth.users
    WHERE id = NEW.id;

    -- Check if user was invited with contact metadata
    IF v_user_metadata ? 'contact_id' THEN
      v_contact_id := (v_user_metadata->>'contact_id')::UUID;

      -- Update the contact to link to this user and mark as accepted
      UPDATE linksy_provider_contacts
      SET
        user_id = NEW.id,
        invitation_accepted_at = NOW(),
        status = 'active',
        email = NULL,  -- Clear temporary email since we now have user_id
        full_name = NULL  -- Clear temporary full_name since we now have user_id
      WHERE id = v_contact_id
        AND user_id IS NULL;  -- Only update if not already linked

    -- Or check if there's a contact with matching email waiting for this user
    ELSIF v_user_email IS NOT NULL THEN
      -- Try to find a contact with this email but no user_id
      UPDATE linksy_provider_contacts
      SET
        user_id = NEW.id,
        invitation_accepted_at = NOW(),
        status = 'active',
        email = NULL,  -- Clear temporary email
        full_name = NULL  -- Clear temporary full_name
      WHERE email = v_user_email
        AND user_id IS NULL
        AND status = 'invited';
    END IF;

    RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.linksy_check_crisis(p_message text, p_site_id uuid)
 RETURNS TABLE(crisis_type text, severity text, response_template text, emergency_resources jsonb, matched_keyword text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT ck.crisis_type, ck.severity, ck.response_template, ck.emergency_resources, ck.keyword
  FROM public.linksy_crisis_keywords ck
  WHERE ck.site_id = p_site_id AND ck.is_active = true
    AND lower(p_message) ILIKE '%' || lower(ck.keyword) || '%'
  ORDER BY
    CASE ck.severity
      WHEN 'critical' THEN 1
      WHEN 'high'     THEN 2
      WHEN 'medium'   THEN 3
      WHEN 'low'      THEN 4
    END
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.linksy_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."activity_feed" to "anon";

grant insert on table "public"."activity_feed" to "anon";

grant references on table "public"."activity_feed" to "anon";

grant select on table "public"."activity_feed" to "anon";

grant trigger on table "public"."activity_feed" to "anon";

grant truncate on table "public"."activity_feed" to "anon";

grant update on table "public"."activity_feed" to "anon";

grant delete on table "public"."activity_feed" to "authenticated";

grant insert on table "public"."activity_feed" to "authenticated";

grant references on table "public"."activity_feed" to "authenticated";

grant select on table "public"."activity_feed" to "authenticated";

grant trigger on table "public"."activity_feed" to "authenticated";

grant truncate on table "public"."activity_feed" to "authenticated";

grant update on table "public"."activity_feed" to "authenticated";

grant delete on table "public"."activity_feed" to "service_role";

grant insert on table "public"."activity_feed" to "service_role";

grant references on table "public"."activity_feed" to "service_role";

grant select on table "public"."activity_feed" to "service_role";

grant trigger on table "public"."activity_feed" to "service_role";

grant truncate on table "public"."activity_feed" to "service_role";

grant update on table "public"."activity_feed" to "service_role";

grant delete on table "public"."api_key_logs" to "anon";

grant insert on table "public"."api_key_logs" to "anon";

grant references on table "public"."api_key_logs" to "anon";

grant select on table "public"."api_key_logs" to "anon";

grant trigger on table "public"."api_key_logs" to "anon";

grant truncate on table "public"."api_key_logs" to "anon";

grant update on table "public"."api_key_logs" to "anon";

grant delete on table "public"."api_key_logs" to "authenticated";

grant insert on table "public"."api_key_logs" to "authenticated";

grant references on table "public"."api_key_logs" to "authenticated";

grant select on table "public"."api_key_logs" to "authenticated";

grant trigger on table "public"."api_key_logs" to "authenticated";

grant truncate on table "public"."api_key_logs" to "authenticated";

grant update on table "public"."api_key_logs" to "authenticated";

grant delete on table "public"."api_key_logs" to "service_role";

grant insert on table "public"."api_key_logs" to "service_role";

grant references on table "public"."api_key_logs" to "service_role";

grant select on table "public"."api_key_logs" to "service_role";

grant trigger on table "public"."api_key_logs" to "service_role";

grant truncate on table "public"."api_key_logs" to "service_role";

grant update on table "public"."api_key_logs" to "service_role";

grant delete on table "public"."api_keys" to "anon";

grant insert on table "public"."api_keys" to "anon";

grant references on table "public"."api_keys" to "anon";

grant select on table "public"."api_keys" to "anon";

grant trigger on table "public"."api_keys" to "anon";

grant truncate on table "public"."api_keys" to "anon";

grant update on table "public"."api_keys" to "anon";

grant delete on table "public"."api_keys" to "authenticated";

grant insert on table "public"."api_keys" to "authenticated";

grant references on table "public"."api_keys" to "authenticated";

grant select on table "public"."api_keys" to "authenticated";

grant trigger on table "public"."api_keys" to "authenticated";

grant truncate on table "public"."api_keys" to "authenticated";

grant update on table "public"."api_keys" to "authenticated";

grant delete on table "public"."api_keys" to "service_role";

grant insert on table "public"."api_keys" to "service_role";

grant references on table "public"."api_keys" to "service_role";

grant select on table "public"."api_keys" to "service_role";

grant trigger on table "public"."api_keys" to "service_role";

grant truncate on table "public"."api_keys" to "service_role";

grant update on table "public"."api_keys" to "service_role";

grant delete on table "public"."background_jobs" to "anon";

grant insert on table "public"."background_jobs" to "anon";

grant references on table "public"."background_jobs" to "anon";

grant select on table "public"."background_jobs" to "anon";

grant trigger on table "public"."background_jobs" to "anon";

grant truncate on table "public"."background_jobs" to "anon";

grant update on table "public"."background_jobs" to "anon";

grant delete on table "public"."background_jobs" to "authenticated";

grant insert on table "public"."background_jobs" to "authenticated";

grant references on table "public"."background_jobs" to "authenticated";

grant select on table "public"."background_jobs" to "authenticated";

grant trigger on table "public"."background_jobs" to "authenticated";

grant truncate on table "public"."background_jobs" to "authenticated";

grant update on table "public"."background_jobs" to "authenticated";

grant delete on table "public"."background_jobs" to "service_role";

grant insert on table "public"."background_jobs" to "service_role";

grant references on table "public"."background_jobs" to "service_role";

grant select on table "public"."background_jobs" to "service_role";

grant trigger on table "public"."background_jobs" to "service_role";

grant truncate on table "public"."background_jobs" to "service_role";

grant update on table "public"."background_jobs" to "service_role";

grant delete on table "public"."company_modules" to "anon";

grant insert on table "public"."company_modules" to "anon";

grant references on table "public"."company_modules" to "anon";

grant select on table "public"."company_modules" to "anon";

grant trigger on table "public"."company_modules" to "anon";

grant truncate on table "public"."company_modules" to "anon";

grant update on table "public"."company_modules" to "anon";

grant delete on table "public"."company_modules" to "authenticated";

grant insert on table "public"."company_modules" to "authenticated";

grant references on table "public"."company_modules" to "authenticated";

grant select on table "public"."company_modules" to "authenticated";

grant trigger on table "public"."company_modules" to "authenticated";

grant truncate on table "public"."company_modules" to "authenticated";

grant update on table "public"."company_modules" to "authenticated";

grant delete on table "public"."company_modules" to "service_role";

grant insert on table "public"."company_modules" to "service_role";

grant references on table "public"."company_modules" to "service_role";

grant select on table "public"."company_modules" to "service_role";

grant trigger on table "public"."company_modules" to "service_role";

grant truncate on table "public"."company_modules" to "service_role";

grant update on table "public"."company_modules" to "service_role";

grant delete on table "public"."custom_field_definitions" to "anon";

grant insert on table "public"."custom_field_definitions" to "anon";

grant references on table "public"."custom_field_definitions" to "anon";

grant select on table "public"."custom_field_definitions" to "anon";

grant trigger on table "public"."custom_field_definitions" to "anon";

grant truncate on table "public"."custom_field_definitions" to "anon";

grant update on table "public"."custom_field_definitions" to "anon";

grant delete on table "public"."custom_field_definitions" to "authenticated";

grant insert on table "public"."custom_field_definitions" to "authenticated";

grant references on table "public"."custom_field_definitions" to "authenticated";

grant select on table "public"."custom_field_definitions" to "authenticated";

grant trigger on table "public"."custom_field_definitions" to "authenticated";

grant truncate on table "public"."custom_field_definitions" to "authenticated";

grant update on table "public"."custom_field_definitions" to "authenticated";

grant delete on table "public"."custom_field_definitions" to "service_role";

grant insert on table "public"."custom_field_definitions" to "service_role";

grant references on table "public"."custom_field_definitions" to "service_role";

grant select on table "public"."custom_field_definitions" to "service_role";

grant trigger on table "public"."custom_field_definitions" to "service_role";

grant truncate on table "public"."custom_field_definitions" to "service_role";

grant update on table "public"."custom_field_definitions" to "service_role";

grant delete on table "public"."custom_field_values" to "anon";

grant insert on table "public"."custom_field_values" to "anon";

grant references on table "public"."custom_field_values" to "anon";

grant select on table "public"."custom_field_values" to "anon";

grant trigger on table "public"."custom_field_values" to "anon";

grant truncate on table "public"."custom_field_values" to "anon";

grant update on table "public"."custom_field_values" to "anon";

grant delete on table "public"."custom_field_values" to "authenticated";

grant insert on table "public"."custom_field_values" to "authenticated";

grant references on table "public"."custom_field_values" to "authenticated";

grant select on table "public"."custom_field_values" to "authenticated";

grant trigger on table "public"."custom_field_values" to "authenticated";

grant truncate on table "public"."custom_field_values" to "authenticated";

grant update on table "public"."custom_field_values" to "authenticated";

grant delete on table "public"."custom_field_values" to "service_role";

grant insert on table "public"."custom_field_values" to "service_role";

grant references on table "public"."custom_field_values" to "service_role";

grant select on table "public"."custom_field_values" to "service_role";

grant trigger on table "public"."custom_field_values" to "service_role";

grant truncate on table "public"."custom_field_values" to "service_role";

grant update on table "public"."custom_field_values" to "service_role";

grant delete on table "public"."event_subscriptions" to "anon";

grant insert on table "public"."event_subscriptions" to "anon";

grant references on table "public"."event_subscriptions" to "anon";

grant select on table "public"."event_subscriptions" to "anon";

grant trigger on table "public"."event_subscriptions" to "anon";

grant truncate on table "public"."event_subscriptions" to "anon";

grant update on table "public"."event_subscriptions" to "anon";

grant delete on table "public"."event_subscriptions" to "authenticated";

grant insert on table "public"."event_subscriptions" to "authenticated";

grant references on table "public"."event_subscriptions" to "authenticated";

grant select on table "public"."event_subscriptions" to "authenticated";

grant trigger on table "public"."event_subscriptions" to "authenticated";

grant truncate on table "public"."event_subscriptions" to "authenticated";

grant update on table "public"."event_subscriptions" to "authenticated";

grant delete on table "public"."event_subscriptions" to "service_role";

grant insert on table "public"."event_subscriptions" to "service_role";

grant references on table "public"."event_subscriptions" to "service_role";

grant select on table "public"."event_subscriptions" to "service_role";

grant trigger on table "public"."event_subscriptions" to "service_role";

grant truncate on table "public"."event_subscriptions" to "service_role";

grant update on table "public"."event_subscriptions" to "service_role";

grant delete on table "public"."feature_flags" to "anon";

grant insert on table "public"."feature_flags" to "anon";

grant references on table "public"."feature_flags" to "anon";

grant select on table "public"."feature_flags" to "anon";

grant trigger on table "public"."feature_flags" to "anon";

grant truncate on table "public"."feature_flags" to "anon";

grant update on table "public"."feature_flags" to "anon";

grant delete on table "public"."feature_flags" to "authenticated";

grant insert on table "public"."feature_flags" to "authenticated";

grant references on table "public"."feature_flags" to "authenticated";

grant select on table "public"."feature_flags" to "authenticated";

grant trigger on table "public"."feature_flags" to "authenticated";

grant truncate on table "public"."feature_flags" to "authenticated";

grant update on table "public"."feature_flags" to "authenticated";

grant delete on table "public"."feature_flags" to "service_role";

grant insert on table "public"."feature_flags" to "service_role";

grant references on table "public"."feature_flags" to "service_role";

grant select on table "public"."feature_flags" to "service_role";

grant trigger on table "public"."feature_flags" to "service_role";

grant truncate on table "public"."feature_flags" to "service_role";

grant update on table "public"."feature_flags" to "service_role";

grant delete on table "public"."file_versions" to "anon";

grant insert on table "public"."file_versions" to "anon";

grant references on table "public"."file_versions" to "anon";

grant select on table "public"."file_versions" to "anon";

grant trigger on table "public"."file_versions" to "anon";

grant truncate on table "public"."file_versions" to "anon";

grant update on table "public"."file_versions" to "anon";

grant delete on table "public"."file_versions" to "authenticated";

grant insert on table "public"."file_versions" to "authenticated";

grant references on table "public"."file_versions" to "authenticated";

grant select on table "public"."file_versions" to "authenticated";

grant trigger on table "public"."file_versions" to "authenticated";

grant truncate on table "public"."file_versions" to "authenticated";

grant update on table "public"."file_versions" to "authenticated";

grant delete on table "public"."file_versions" to "service_role";

grant insert on table "public"."file_versions" to "service_role";

grant references on table "public"."file_versions" to "service_role";

grant select on table "public"."file_versions" to "service_role";

grant trigger on table "public"."file_versions" to "service_role";

grant truncate on table "public"."file_versions" to "service_role";

grant update on table "public"."file_versions" to "service_role";

grant delete on table "public"."invoices" to "anon";

grant insert on table "public"."invoices" to "anon";

grant references on table "public"."invoices" to "anon";

grant select on table "public"."invoices" to "anon";

grant trigger on table "public"."invoices" to "anon";

grant truncate on table "public"."invoices" to "anon";

grant update on table "public"."invoices" to "anon";

grant delete on table "public"."invoices" to "authenticated";

grant insert on table "public"."invoices" to "authenticated";

grant references on table "public"."invoices" to "authenticated";

grant select on table "public"."invoices" to "authenticated";

grant trigger on table "public"."invoices" to "authenticated";

grant truncate on table "public"."invoices" to "authenticated";

grant update on table "public"."invoices" to "authenticated";

grant delete on table "public"."invoices" to "service_role";

grant insert on table "public"."invoices" to "service_role";

grant references on table "public"."invoices" to "service_role";

grant select on table "public"."invoices" to "service_role";

grant trigger on table "public"."invoices" to "service_role";

grant truncate on table "public"."invoices" to "service_role";

grant update on table "public"."invoices" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."rate_limit_usage" to "anon";

grant insert on table "public"."rate_limit_usage" to "anon";

grant references on table "public"."rate_limit_usage" to "anon";

grant select on table "public"."rate_limit_usage" to "anon";

grant trigger on table "public"."rate_limit_usage" to "anon";

grant truncate on table "public"."rate_limit_usage" to "anon";

grant update on table "public"."rate_limit_usage" to "anon";

grant delete on table "public"."rate_limit_usage" to "authenticated";

grant insert on table "public"."rate_limit_usage" to "authenticated";

grant references on table "public"."rate_limit_usage" to "authenticated";

grant select on table "public"."rate_limit_usage" to "authenticated";

grant trigger on table "public"."rate_limit_usage" to "authenticated";

grant truncate on table "public"."rate_limit_usage" to "authenticated";

grant update on table "public"."rate_limit_usage" to "authenticated";

grant delete on table "public"."rate_limit_usage" to "service_role";

grant insert on table "public"."rate_limit_usage" to "service_role";

grant references on table "public"."rate_limit_usage" to "service_role";

grant select on table "public"."rate_limit_usage" to "service_role";

grant trigger on table "public"."rate_limit_usage" to "service_role";

grant truncate on table "public"."rate_limit_usage" to "service_role";

grant update on table "public"."rate_limit_usage" to "service_role";

grant delete on table "public"."subscription_plans" to "anon";

grant insert on table "public"."subscription_plans" to "anon";

grant references on table "public"."subscription_plans" to "anon";

grant select on table "public"."subscription_plans" to "anon";

grant trigger on table "public"."subscription_plans" to "anon";

grant truncate on table "public"."subscription_plans" to "anon";

grant update on table "public"."subscription_plans" to "anon";

grant delete on table "public"."subscription_plans" to "authenticated";

grant insert on table "public"."subscription_plans" to "authenticated";

grant references on table "public"."subscription_plans" to "authenticated";

grant select on table "public"."subscription_plans" to "authenticated";

grant trigger on table "public"."subscription_plans" to "authenticated";

grant truncate on table "public"."subscription_plans" to "authenticated";

grant update on table "public"."subscription_plans" to "authenticated";

grant delete on table "public"."subscription_plans" to "service_role";

grant insert on table "public"."subscription_plans" to "service_role";

grant references on table "public"."subscription_plans" to "service_role";

grant select on table "public"."subscription_plans" to "service_role";

grant trigger on table "public"."subscription_plans" to "service_role";

grant truncate on table "public"."subscription_plans" to "service_role";

grant update on table "public"."subscription_plans" to "service_role";

grant delete on table "public"."system_events" to "anon";

grant insert on table "public"."system_events" to "anon";

grant references on table "public"."system_events" to "anon";

grant select on table "public"."system_events" to "anon";

grant trigger on table "public"."system_events" to "anon";

grant truncate on table "public"."system_events" to "anon";

grant update on table "public"."system_events" to "anon";

grant delete on table "public"."system_events" to "authenticated";

grant insert on table "public"."system_events" to "authenticated";

grant references on table "public"."system_events" to "authenticated";

grant select on table "public"."system_events" to "authenticated";

grant trigger on table "public"."system_events" to "authenticated";

grant truncate on table "public"."system_events" to "authenticated";

grant update on table "public"."system_events" to "authenticated";

grant delete on table "public"."system_events" to "service_role";

grant insert on table "public"."system_events" to "service_role";

grant references on table "public"."system_events" to "service_role";

grant select on table "public"."system_events" to "service_role";

grant trigger on table "public"."system_events" to "service_role";

grant truncate on table "public"."system_events" to "service_role";

grant update on table "public"."system_events" to "service_role";

grant delete on table "public"."tenant_subscriptions" to "anon";

grant insert on table "public"."tenant_subscriptions" to "anon";

grant references on table "public"."tenant_subscriptions" to "anon";

grant select on table "public"."tenant_subscriptions" to "anon";

grant trigger on table "public"."tenant_subscriptions" to "anon";

grant truncate on table "public"."tenant_subscriptions" to "anon";

grant update on table "public"."tenant_subscriptions" to "anon";

grant delete on table "public"."tenant_subscriptions" to "authenticated";

grant insert on table "public"."tenant_subscriptions" to "authenticated";

grant references on table "public"."tenant_subscriptions" to "authenticated";

grant select on table "public"."tenant_subscriptions" to "authenticated";

grant trigger on table "public"."tenant_subscriptions" to "authenticated";

grant truncate on table "public"."tenant_subscriptions" to "authenticated";

grant update on table "public"."tenant_subscriptions" to "authenticated";

grant delete on table "public"."tenant_subscriptions" to "service_role";

grant insert on table "public"."tenant_subscriptions" to "service_role";

grant references on table "public"."tenant_subscriptions" to "service_role";

grant select on table "public"."tenant_subscriptions" to "service_role";

grant trigger on table "public"."tenant_subscriptions" to "service_role";

grant truncate on table "public"."tenant_subscriptions" to "service_role";

grant update on table "public"."tenant_subscriptions" to "service_role";

grant delete on table "public"."usage_records" to "anon";

grant insert on table "public"."usage_records" to "anon";

grant references on table "public"."usage_records" to "anon";

grant select on table "public"."usage_records" to "anon";

grant trigger on table "public"."usage_records" to "anon";

grant truncate on table "public"."usage_records" to "anon";

grant update on table "public"."usage_records" to "anon";

grant delete on table "public"."usage_records" to "authenticated";

grant insert on table "public"."usage_records" to "authenticated";

grant references on table "public"."usage_records" to "authenticated";

grant select on table "public"."usage_records" to "authenticated";

grant trigger on table "public"."usage_records" to "authenticated";

grant truncate on table "public"."usage_records" to "authenticated";

grant update on table "public"."usage_records" to "authenticated";

grant delete on table "public"."usage_records" to "service_role";

grant insert on table "public"."usage_records" to "service_role";

grant references on table "public"."usage_records" to "service_role";

grant select on table "public"."usage_records" to "service_role";

grant trigger on table "public"."usage_records" to "service_role";

grant truncate on table "public"."usage_records" to "service_role";

grant update on table "public"."usage_records" to "service_role";

grant delete on table "public"."user_locations" to "anon";

grant insert on table "public"."user_locations" to "anon";

grant references on table "public"."user_locations" to "anon";

grant select on table "public"."user_locations" to "anon";

grant trigger on table "public"."user_locations" to "anon";

grant truncate on table "public"."user_locations" to "anon";

grant update on table "public"."user_locations" to "anon";

grant delete on table "public"."user_locations" to "authenticated";

grant insert on table "public"."user_locations" to "authenticated";

grant references on table "public"."user_locations" to "authenticated";

grant select on table "public"."user_locations" to "authenticated";

grant trigger on table "public"."user_locations" to "authenticated";

grant truncate on table "public"."user_locations" to "authenticated";

grant update on table "public"."user_locations" to "authenticated";

grant delete on table "public"."user_locations" to "service_role";

grant insert on table "public"."user_locations" to "service_role";

grant references on table "public"."user_locations" to "service_role";

grant select on table "public"."user_locations" to "service_role";

grant trigger on table "public"."user_locations" to "service_role";

grant truncate on table "public"."user_locations" to "service_role";

grant update on table "public"."user_locations" to "service_role";

grant delete on table "public"."user_module_permissions" to "anon";

grant insert on table "public"."user_module_permissions" to "anon";

grant references on table "public"."user_module_permissions" to "anon";

grant select on table "public"."user_module_permissions" to "anon";

grant trigger on table "public"."user_module_permissions" to "anon";

grant truncate on table "public"."user_module_permissions" to "anon";

grant update on table "public"."user_module_permissions" to "anon";

grant delete on table "public"."user_module_permissions" to "authenticated";

grant insert on table "public"."user_module_permissions" to "authenticated";

grant references on table "public"."user_module_permissions" to "authenticated";

grant select on table "public"."user_module_permissions" to "authenticated";

grant trigger on table "public"."user_module_permissions" to "authenticated";

grant truncate on table "public"."user_module_permissions" to "authenticated";

grant update on table "public"."user_module_permissions" to "authenticated";

grant delete on table "public"."user_module_permissions" to "service_role";

grant insert on table "public"."user_module_permissions" to "service_role";

grant references on table "public"."user_module_permissions" to "service_role";

grant select on table "public"."user_module_permissions" to "service_role";

grant trigger on table "public"."user_module_permissions" to "service_role";

grant truncate on table "public"."user_module_permissions" to "service_role";

grant update on table "public"."user_module_permissions" to "service_role";

grant delete on table "public"."webhook_deliveries" to "anon";

grant insert on table "public"."webhook_deliveries" to "anon";

grant references on table "public"."webhook_deliveries" to "anon";

grant select on table "public"."webhook_deliveries" to "anon";

grant trigger on table "public"."webhook_deliveries" to "anon";

grant truncate on table "public"."webhook_deliveries" to "anon";

grant update on table "public"."webhook_deliveries" to "anon";

grant delete on table "public"."webhook_deliveries" to "authenticated";

grant insert on table "public"."webhook_deliveries" to "authenticated";

grant references on table "public"."webhook_deliveries" to "authenticated";

grant select on table "public"."webhook_deliveries" to "authenticated";

grant trigger on table "public"."webhook_deliveries" to "authenticated";

grant truncate on table "public"."webhook_deliveries" to "authenticated";

grant update on table "public"."webhook_deliveries" to "authenticated";

grant delete on table "public"."webhook_deliveries" to "service_role";

grant insert on table "public"."webhook_deliveries" to "service_role";

grant references on table "public"."webhook_deliveries" to "service_role";

grant select on table "public"."webhook_deliveries" to "service_role";

grant trigger on table "public"."webhook_deliveries" to "service_role";

grant truncate on table "public"."webhook_deliveries" to "service_role";

grant update on table "public"."webhook_deliveries" to "service_role";

grant delete on table "public"."webhook_endpoints" to "anon";

grant insert on table "public"."webhook_endpoints" to "anon";

grant references on table "public"."webhook_endpoints" to "anon";

grant select on table "public"."webhook_endpoints" to "anon";

grant trigger on table "public"."webhook_endpoints" to "anon";

grant truncate on table "public"."webhook_endpoints" to "anon";

grant update on table "public"."webhook_endpoints" to "anon";

grant delete on table "public"."webhook_endpoints" to "authenticated";

grant insert on table "public"."webhook_endpoints" to "authenticated";

grant references on table "public"."webhook_endpoints" to "authenticated";

grant select on table "public"."webhook_endpoints" to "authenticated";

grant trigger on table "public"."webhook_endpoints" to "authenticated";

grant truncate on table "public"."webhook_endpoints" to "authenticated";

grant update on table "public"."webhook_endpoints" to "authenticated";

grant delete on table "public"."webhook_endpoints" to "service_role";

grant insert on table "public"."webhook_endpoints" to "service_role";

grant references on table "public"."webhook_endpoints" to "service_role";

grant select on table "public"."webhook_endpoints" to "service_role";

grant trigger on table "public"."webhook_endpoints" to "service_role";

grant truncate on table "public"."webhook_endpoints" to "service_role";

grant update on table "public"."webhook_endpoints" to "service_role";


  create policy "Company admins can view API key logs"
  on "public"."api_key_logs"
  as permissive
  for select
  to public
using ((api_key_id IN ( SELECT api_keys.id
   FROM public.api_keys
  WHERE (api_keys.tenant_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)))));



  create policy "Company admins can manage API keys"
  on "public"."api_keys"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), tenant_id));



  create policy "Tenant admins can view their logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using (((tenant_id IS NOT NULL) AND public.is_tenant_admin(tenant_id)));



  create policy "Company admins manage company modules"
  on "public"."company_modules"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), company_id));



  create policy "Users can view their company modules"
  on "public"."company_modules"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)));



  create policy "Tenant admins can delete tenant files"
  on "public"."files"
  as permissive
  for delete
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Users can delete their files"
  on "public"."files"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "Users can delete their own files or admins can delete tenant fi"
  on "public"."files"
  as permissive
  for delete
  to public
using (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))) AND ((uploaded_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.tenant_id = files.tenant_id) AND (tenant_users.role = 'admin'::public.tenant_role)))))));



  create policy "Users can update their own files or admins can update tenant fi"
  on "public"."files"
  as permissive
  for update
  to public
using (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))) AND ((uploaded_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.tenant_id = files.tenant_id) AND (tenant_users.role = 'admin'::public.tenant_role)))))));



  create policy "Users can upload files to their tenant"
  on "public"."files"
  as permissive
  for insert
  to public
with check (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))) AND (uploaded_by = auth.uid())));



  create policy "Users can upload files"
  on "public"."files"
  as permissive
  for insert
  to public
with check (public.belongs_to_tenant(tenant_id));



  create policy "Users can view files from their tenant"
  on "public"."files"
  as permissive
  for select
  to public
using ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));



  create policy "Users can view tenant files"
  on "public"."files"
  as permissive
  for select
  to public
using (public.belongs_to_tenant(tenant_id));



  create policy "Admins can create invitations"
  on "public"."invitations"
  as permissive
  for insert
  to public
with check ((public.is_tenant_admin(tenant_id) OR public.is_site_admin()));



  create policy "Admins can delete invitations"
  on "public"."invitations"
  as permissive
  for delete
  to public
using ((public.is_tenant_admin(tenant_id) OR public.is_site_admin()));



  create policy "Admins can view invitations"
  on "public"."invitations"
  as permissive
  for select
  to public
using ((public.is_tenant_admin(tenant_id) OR public.is_site_admin()));



  create policy "Company admins can manage locations"
  on "public"."locations"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), tenant_id));



  create policy "Users can view locations in their tenants"
  on "public"."locations"
  as permissive
  for select
  to public
using ((tenant_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)));



  create policy "Users can update their notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "Users can view their notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Tenant admins can manage their modules"
  on "public"."tenant_modules"
  as permissive
  for all
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Tenant admins can manage their memberships"
  on "public"."tenant_users"
  as permissive
  for all
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Tenant admins can view their memberships"
  on "public"."tenant_users"
  as permissive
  for select
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Users can view their memberships"
  on "public"."tenant_users"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Admins can update their tenant"
  on "public"."tenants"
  as permissive
  for update
  to public
using ((public.is_site_admin() OR public.is_tenant_admin(id)));



  create policy "Company admins manage user module permissions"
  on "public"."user_module_permissions"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), company_id));



  create policy "Users can view module permissions in their companies"
  on "public"."user_module_permissions"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)));



  create policy "Users can view tenant members"
  on "public"."users"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.tenant_users tu1
     JOIN public.tenant_users tu2 ON ((tu1.tenant_id = tu2.tenant_id)))
  WHERE ((tu1.user_id = auth.uid()) AND (tu2.user_id = users.id)))));


CREATE TRIGGER files_updated_at_trigger BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_files_updated_at();

CREATE TRIGGER locations_search_update BEFORE INSERT OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_location_search_vector();

CREATE TRIGGER link_invited_user_trigger AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.link_invited_user_to_contact();

drop trigger if exists "link_invited_user_trigger" on "auth"."users";


  create policy "Anyone can view tenant uploads"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'tenant-uploads'::text));



  create policy "Anyone can view user uploads"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'user-uploads'::text));



  create policy "Avatar images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Tenant admins can delete tenant uploads"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'tenant-uploads'::text));



  create policy "Tenant admins can update tenant uploads"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'tenant-uploads'::text));



  create policy "Tenant admins can upload to their tenant folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'tenant-uploads'::text) AND ((storage.foldername(name))[1] = 'logos'::text)));



  create policy "Users can delete their own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can delete their own uploads"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can update their own avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update their own uploads"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can upload their own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload to their own folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));


CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();




-- ************************************************************
-- Migration: 20260225211500_restore_ticket_custom_data.sql
-- ************************************************************

-- Restore custom_data on linksy_tickets (used by widget intake forms)

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN linksy_tickets.custom_data IS 'Custom field responses from host intake form (key-value pairs)';

CREATE INDEX IF NOT EXISTS idx_tickets_custom_data
ON linksy_tickets USING GIN (custom_data);


-- ************************************************************
-- Migration: 20260225223000_region_tenant_model.sql
-- ************************************************************

-- Region tenant model: create region tenants and assign all providers to Impact Clay

DO $$
DECLARE
  impact_tenant_id UUID;
  united_tenant_id UUID;
BEGIN
  -- Create Impact Clay tenant if missing
  SELECT id INTO impact_tenant_id
  FROM tenants
  WHERE slug = 'impact-clay'
  LIMIT 1;

  IF impact_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, settings, branding)
    VALUES (
      'Impact Clay',
      'impact-clay',
      jsonb_build_object('type', 'region'),
      '{}'::jsonb
    )
    RETURNING id INTO impact_tenant_id;
  ELSE
    UPDATE tenants
    SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('type', 'region')
    WHERE id = impact_tenant_id;
  END IF;

  -- Create United Way of North Florida tenant if missing (unassigned for now)
  SELECT id INTO united_tenant_id
  FROM tenants
  WHERE slug = 'united-way-of-north-florida'
  LIMIT 1;

  IF united_tenant_id IS NULL THEN
    INSERT INTO tenants (name, slug, settings, branding)
    VALUES (
      'United Way of North Florida',
      'united-way-of-north-florida',
      jsonb_build_object('type', 'region'),
      '{}'::jsonb
    )
    RETURNING id INTO united_tenant_id;
  ELSE
    UPDATE tenants
    SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('type', 'region')
    WHERE id = united_tenant_id;
  END IF;

  -- Assign all providers to Impact Clay
  UPDATE linksy_providers
  SET tenant_id = impact_tenant_id;

  -- Point webhooks to Impact Clay
  UPDATE linksy_webhooks
  SET tenant_id = impact_tenant_id;

  -- Ensure site admins are tenant admins for Impact Clay
  INSERT INTO tenant_users (tenant_id, user_id, role)
  SELECT impact_tenant_id, u.id, 'admin'::tenant_role
  FROM users u
  WHERE u.role = 'site_admin'
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;
END $$;


-- ************************************************************
-- Migration: 20260303000001_ticket_number_sequence.sql
-- ************************************************************

-- Create a sequence for ticket numbering starting at 2001
-- This replaces the read-count-then-insert pattern which has a race condition
CREATE SEQUENCE IF NOT EXISTS linksy_ticket_number_seq START WITH 2001;

-- Advance the sequence past any existing tickets to avoid collisions
DO $$
DECLARE
  max_seq INTEGER;
BEGIN
  -- Extract the numeric sequence part from existing ticket numbers (R-XXXX-YY)
  SELECT COALESCE(MAX(
    CAST(split_part(ticket_number, '-', 2) AS INTEGER)
  ), 2000) + 1
  INTO max_seq
  FROM linksy_tickets
  WHERE ticket_number IS NOT NULL AND ticket_number LIKE 'R-%';

  -- Only advance if existing tickets have higher numbers
  IF max_seq > 2001 THEN
    PERFORM setval('linksy_ticket_number_seq', max_seq, false);
  END IF;
END $$;

-- RPC function that atomically generates the next ticket number
-- Returns format: R-XXXX-YY where XXXX is from the sequence and YY is random
CREATE OR REPLACE FUNCTION linksy_next_ticket_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'R-' || nextval('linksy_ticket_number_seq')::text || '-' || lpad((floor(random() * 100))::text, 2, '0');
$$;


-- ************************************************************
-- Migration: 20260303000002_rls_security_hardening.sql
-- ************************************************************

-- RLS Security Hardening (from Audit 2026-03-02)
-- Addresses 7 RLS policy gaps identified in the security audit.

------------------------------------------------------------
-- 1. linksy_provider_contacts — RLS was DISABLED entirely
------------------------------------------------------------
ALTER TABLE linksy_provider_contacts ENABLE ROW LEVEL SECURITY;

-- Site admins can do anything
CREATE POLICY "provider_contacts_site_admin_all"
  ON linksy_provider_contacts FOR ALL
  USING (is_site_admin())
  WITH CHECK (is_site_admin());

-- Provider contacts can read contacts for their own provider
CREATE POLICY "provider_contacts_read_own_provider"
  ON linksy_provider_contacts FOR SELECT
  USING (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

-- Provider admins can insert/update contacts for their own provider
CREATE POLICY "provider_contacts_admin_write"
  ON linksy_provider_contacts FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.provider_role = 'admin' AND pc.status = 'active'
    )
    OR is_site_admin()
  );

CREATE POLICY "provider_contacts_admin_update"
  ON linksy_provider_contacts FOR UPDATE
  USING (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.provider_role = 'admin' AND pc.status = 'active'
    )
    OR is_site_admin()
  );

------------------------------------------------------------
-- 2. linksy_provider_notes — is_private not enforced at RLS
------------------------------------------------------------
-- Drop the existing overly-permissive SELECT policy if it exists, then recreate
DO $$
BEGIN
  -- Try to drop existing select policies on provider notes
  DROP POLICY IF EXISTS "provider_notes_select" ON linksy_provider_notes;
  DROP POLICY IF EXISTS "Provider notes are viewable by site admins and provider contacts" ON linksy_provider_notes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Site admins see all notes (including private)
CREATE POLICY "provider_notes_site_admin_read"
  ON linksy_provider_notes FOR SELECT
  USING (is_site_admin());

-- Provider contacts see non-private notes for their provider
CREATE POLICY "provider_notes_contact_read"
  ON linksy_provider_notes FOR SELECT
  USING (
    is_private = false
    AND provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

------------------------------------------------------------
-- 3. linksy_tickets — Add client-view policy (by email)
------------------------------------------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "tickets_client_view" ON linksy_tickets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Clients can view their own tickets by matching email
CREATE POLICY "tickets_client_view"
  ON linksy_tickets FOR SELECT
  USING (
    client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

------------------------------------------------------------
-- 4. linksy_call_logs — Scope to provider contacts
------------------------------------------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "call_logs_read" ON linksy_call_logs;
  DROP POLICY IF EXISTS "call_logs_insert" ON linksy_call_logs;
  DROP POLICY IF EXISTS "call_logs_update" ON linksy_call_logs;
  DROP POLICY IF EXISTS "Enable read access for all users" ON linksy_call_logs;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON linksy_call_logs;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON linksy_call_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "call_logs_site_admin_all"
  ON linksy_call_logs FOR ALL
  USING (is_site_admin());

CREATE POLICY "call_logs_provider_contact_read"
  ON linksy_call_logs FOR SELECT
  USING (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

CREATE POLICY "call_logs_provider_contact_insert"
  ON linksy_call_logs FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.status = 'active'
    )
  );

------------------------------------------------------------
-- 5. linksy_host_custom_fields — Scope to provider
------------------------------------------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "custom_fields_read" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "custom_fields_write" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "Enable read access for all users" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON linksy_host_custom_fields;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON linksy_host_custom_fields;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "host_custom_fields_site_admin"
  ON linksy_host_custom_fields FOR ALL
  USING (is_site_admin());

CREATE POLICY "host_custom_fields_provider_admin_read"
  ON linksy_host_custom_fields FOR SELECT
  USING (
    provider_id IN (
      SELECT pc.provider_id FROM linksy_provider_contacts pc
      WHERE pc.user_id = auth.uid() AND pc.provider_role = 'admin' AND pc.status = 'active'
    )
  );

------------------------------------------------------------
-- 6. linksy_surveys — Restrict UPDATE to owner or admin
------------------------------------------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "surveys_update" ON linksy_surveys;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON linksy_surveys;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "surveys_admin_update"
  ON linksy_surveys FOR UPDATE
  USING (is_site_admin());

-- Anonymous token-based submission is handled by INSERT policy (not affected)

------------------------------------------------------------
-- 7. linksy_search_sessions — Add row filter to anon UPDATE
------------------------------------------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "search_sessions_anon_update" ON linksy_search_sessions;
  DROP POLICY IF EXISTS "Enable update for anon" ON linksy_search_sessions;
  DROP POLICY IF EXISTS "Allow anon update" ON linksy_search_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Anon users can only update their own session (matched by ID passed in the query)
CREATE POLICY "search_sessions_anon_update"
  ON linksy_search_sessions FOR UPDATE
  USING (true)  -- RLS filter: row must match the WHERE clause in the Supabase query
  WITH CHECK (true);

-- Note: The actual session scoping is enforced by the application layer
-- which always includes .eq('id', sessionId) in update queries.
-- A tighter policy would use a session token column, but that requires schema changes.


-- ************************************************************
-- Migration: 20260306000001_add_is_test_to_tickets.sql
-- ************************************************************

-- Add is_test flag for test referral detection
-- Auto-flagged when client_name = 'Mega Coolmint' (case-insensitive)
-- Excluded from analytics by default

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering test referrals out of analytics queries
CREATE INDEX IF NOT EXISTS idx_linksy_tickets_is_test
  ON linksy_tickets (is_test) WHERE is_test = TRUE;

-- Backfill: flag existing test referrals by client name
UPDATE linksy_tickets
  SET is_test = TRUE
  WHERE LOWER(TRIM(client_name)) = 'mega coolmint'
    AND is_test = FALSE;


-- ************************************************************
-- Migration: 20260306000002_add_ticket_status_values.sql
-- ************************************************************

-- Add new ticket status values: in_process and transferred_another_provider
-- TASK-014: Support "In Process" and "Transferred Another Provider" statuses

ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'in_process';
ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'transferred_another_provider';


-- ************************************************************
-- Migration: 20260306000003_add_duplicate_flag_to_tickets.sql
-- ************************************************************

-- TASK-029: Add duplicate referral flag column
-- Tracks referrals flagged by duplicate detection (Case A: multi-provider, Case C: consecutive day)

ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS duplicate_flag_type TEXT
    CHECK (duplicate_flag_type IN ('case_a', 'case_b', 'case_c'));

COMMENT ON COLUMN linksy_tickets.duplicate_flag_type IS 'Duplicate detection flag: case_a=5+ providers same service same day, case_b=same provider+service same day (blocked), case_c=consecutive day same provider';

-- Index for admin potential duplicates report
CREATE INDEX IF NOT EXISTS idx_linksy_tickets_duplicate_flag
  ON linksy_tickets (duplicate_flag_type)
  WHERE duplicate_flag_type IS NOT NULL;

-- Performance index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_provider_date
  ON linksy_tickets (client_email, provider_id, created_at DESC)
  WHERE client_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_tickets_client_phone_provider_date
  ON linksy_tickets (client_phone, provider_id, created_at DESC)
  WHERE client_phone IS NOT NULL;


-- ************************************************************
-- Migration: 20260307000001_provider_source_and_freeze.sql
-- ************************************************************

-- TASK-008: Provider source tagging
-- TASK-019: Provider freeze/hold
-- Add source and freeze columns to linksy_providers

-- Source tagging
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_other TEXT DEFAULT NULL;

COMMENT ON COLUMN linksy_providers.source IS 'Provider source: CC, UW, IW, Self-Registered, Other';
COMMENT ON COLUMN linksy_providers.source_other IS 'Free text when source is Other';

-- Freeze/hold
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frozen_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS frozen_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS freeze_return_date DATE DEFAULT NULL;

COMMENT ON COLUMN linksy_providers.is_frozen IS 'Whether this provider is frozen (no new referrals)';
COMMENT ON COLUMN linksy_providers.frozen_reason IS 'Reason for freezing';
COMMENT ON COLUMN linksy_providers.frozen_at IS 'When provider was frozen';
COMMENT ON COLUMN linksy_providers.frozen_by IS 'User ID who froze the provider';
COMMENT ON COLUMN linksy_providers.freeze_return_date IS 'Expected date to unfreeze';

-- Index for filtering frozen providers
CREATE INDEX IF NOT EXISTS idx_linksy_providers_is_frozen ON linksy_providers(is_frozen) WHERE is_frozen = true;
CREATE INDEX IF NOT EXISTS idx_linksy_providers_source ON linksy_providers(source) WHERE source IS NOT NULL;


-- ************************************************************
-- Migration: 20260307000002_add_contact_id_to_provider_notes.sql
-- ************************************************************

-- TASK-020: Call log + notes on Provider Contact page
-- Add contact_id to allow per-contact notes

ALTER TABLE linksy_provider_notes
  ADD COLUMN IF NOT EXISTS contact_id UUID DEFAULT NULL
  REFERENCES linksy_provider_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_linksy_provider_notes_contact_id
  ON linksy_provider_notes(contact_id)
  WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN linksy_provider_notes.contact_id IS 'Optional: links note to a specific contact';


-- ************************************************************
-- Migration: 20260307000003_add_tenant_id_to_provider_notes.sql
-- ************************************************************

-- Add created_by_tenant_id to linksy_provider_notes for org-scoped private note visibility
-- Private notes should only be visible to the creating organization + site admins

ALTER TABLE linksy_provider_notes
ADD COLUMN IF NOT EXISTS created_by_tenant_id UUID REFERENCES tenants(id);

-- Index for filtering notes by tenant
CREATE INDEX IF NOT EXISTS idx_provider_notes_tenant_id
ON linksy_provider_notes(created_by_tenant_id)
WHERE created_by_tenant_id IS NOT NULL;

COMMENT ON COLUMN linksy_provider_notes.created_by_tenant_id IS 'Tenant ID of the organization that created this note. Used for org-scoped private note visibility.';


-- ************************************************************
-- Migration: 20260307000004_search_session_token_rls.sql
-- ************************************************************

-- Fix LOW audit finding: linksy_search_sessions anon update has no row filter.
-- Adds a session_token UUID column so RLS can verify the caller owns the session.
-- The token is generated on insert and must be provided on update.

-- 1. Add session_token column
ALTER TABLE linksy_search_sessions
  ADD COLUMN IF NOT EXISTS session_token UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Backfill existing rows with unique tokens
UPDATE linksy_search_sessions SET session_token = gen_random_uuid() WHERE session_token IS NULL;

-- 3. Index for lookups
CREATE INDEX IF NOT EXISTS idx_search_sessions_token ON linksy_search_sessions (session_token);

-- 4. Replace the overly-permissive anon update policy
DROP POLICY IF EXISTS "search_sessions_anon_update" ON linksy_search_sessions;
DROP POLICY IF EXISTS "sessions_anon_update" ON linksy_search_sessions;

-- Anon users can only update a session if they provide the matching session_token
-- via a custom Postgres setting (set by the API before the query).
-- Service-role clients bypass RLS entirely, so the search API is unaffected.
CREATE POLICY "search_sessions_anon_update"
  ON linksy_search_sessions FOR UPDATE
  USING (
    session_token::text = coalesce(current_setting('app.session_token', true), '')
  )
  WITH CHECK (true);


-- ************************************************************
-- Migration: 20260307000005_search_events_function.sql
-- ************************************************************

-- RPC function to find upcoming published events for matched providers.
-- Events are matched via the provider_needs junction: if a provider serves
-- a matching need, its future published events are returned.

CREATE OR REPLACE FUNCTION linksy_search_events_by_providers(
  p_provider_ids UUID[],
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  recurrence_rule TEXT,
  provider_id UUID,
  provider_name TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.recurrence_rule,
    e.provider_id,
    p.name AS provider_name
  FROM linksy_provider_events e
  JOIN linksy_providers p ON p.id = e.provider_id
  WHERE e.provider_id = ANY(p_provider_ids)
    AND e.status = 'approved'
    AND e.is_public = true
    AND e.event_date > now()
  ORDER BY e.event_date ASC
  LIMIT p_limit;
$$;


-- ************************************************************
-- Migration: 20260309000001_event_service_category_and_address.sql
-- ************************************************************

-- Add service category (need_id), address, and geocoordinates to provider events.
-- These fields are mandatory for new events going forward; existing rows keep NULLs.

ALTER TABLE linksy_provider_events
  ADD COLUMN IF NOT EXISTS need_id UUID REFERENCES linksy_needs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for filtering events by need (service category)
CREATE INDEX IF NOT EXISTS idx_provider_events_need_id
  ON linksy_provider_events (need_id)
  WHERE need_id IS NOT NULL;

-- Spatial index for proximity searches (events within radius)
CREATE INDEX IF NOT EXISTS idx_provider_events_lat_lng
  ON linksy_provider_events (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Replace the existing search function with one that supports:
--   1) Filtering by need IDs (service categories)
--   2) Proximity-based sorting when user location is available
--   3) Independent event search (not limited to matched provider IDs)
CREATE OR REPLACE FUNCTION linksy_search_events_by_needs(
  p_need_ids UUID[],
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_miles DOUBLE PRECISION DEFAULT 50,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  recurrence_rule TEXT,
  provider_id UUID,
  provider_name TEXT,
  need_id UUID,
  need_name TEXT,
  category_name TEXT,
  distance_miles DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.address,
    e.latitude,
    e.longitude,
    e.recurrence_rule,
    e.provider_id,
    p.name AS provider_name,
    e.need_id,
    n.name AS need_name,
    nc.name AS category_name,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      THEN ROUND(
        (ST_DistanceSphere(
          ST_MakePoint(e.longitude, e.latitude),
          ST_MakePoint(p_lng, p_lat)
        ) / 1609.34)::numeric, 1
      )::double precision
      ELSE NULL
    END AS distance_miles
  FROM linksy_provider_events e
  JOIN linksy_providers p ON p.id = e.provider_id
  LEFT JOIN linksy_needs n ON n.id = e.need_id
  LEFT JOIN linksy_need_categories nc ON nc.id = n.category_id
  WHERE e.status = 'approved'
    AND e.is_public = true
    AND e.event_date > now()
    AND (
      -- Match events tagged with any of the searched needs
      e.need_id = ANY(p_need_ids)
      -- Also include events from providers that serve those needs (legacy untagged events)
      OR (e.need_id IS NULL AND e.provider_id IN (
        SELECT pn.provider_id FROM linksy_provider_needs pn WHERE pn.need_id = ANY(p_need_ids)
      ))
    )
    AND (
      -- If location provided, filter by radius
      p_lat IS NULL OR p_lng IS NULL
      OR e.latitude IS NULL OR e.longitude IS NULL
      OR ST_DistanceSphere(
        ST_MakePoint(e.longitude, e.latitude),
        ST_MakePoint(p_lng, p_lat)
      ) <= (p_radius_miles * 1609.34)
    )
  ORDER BY
    -- Prefer events tagged with a need over untagged fallbacks
    (CASE WHEN e.need_id = ANY(p_need_ids) THEN 0 ELSE 1 END),
    -- Then by distance if available
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      THEN ST_DistanceSphere(
        ST_MakePoint(e.longitude, e.latitude),
        ST_MakePoint(p_lng, p_lat)
      )
      ELSE 0
    END,
    e.event_date ASC
  LIMIT p_limit;
$$;


-- ************************************************************
-- Migration: 20260312000001_add_tenant_is_active.sql
-- ************************************************************

-- TASK-037: Archive "Impact Clay" tenant (read-only, preserve historical data)
-- Adds is_active flag to tenants table and archives Impact Clay

-- Add is_active column (default true so existing tenants remain active)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Archive "Impact Clay" tenant by slug
UPDATE tenants SET is_active = false WHERE slug = 'impact-clay';


-- ************************************************************
-- Migration: 20260312000002_add_transferred_pending_status.sql
-- ************************************************************

-- Migration: Add 'transferred_pending' status to linksy_ticket_status enum
-- TASK-026: Referral transfer workflow
-- When a referral is transferred to a new provider, the new provider sees it as "Transferred Pending"

ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'transferred_pending';


-- ************************************************************
-- Migration: 20260320000001_fix_email_templates_schema.sql
-- ************************************************************

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


-- ************************************************************
-- Migration: 20260321000001_add_phone_extension_to_locations_contacts.sql
-- ************************************************************

-- Add phone_extension to locations and contacts for standardized phone display
-- Format: 1-(XXX)-XXX-XXXX ext. YYYY

ALTER TABLE linksy_locations
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_locations.phone_extension
  IS 'Phone extension for the location phone number';

ALTER TABLE linksy_provider_contacts
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_provider_contacts.phone_extension
  IS 'Phone extension for the contact phone number';

ALTER TABLE linksy_provider_applications
ADD COLUMN IF NOT EXISTS phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_provider_applications.phone_extension
  IS 'Phone extension for the organization phone number';

ALTER TABLE linksy_provider_applications
ADD COLUMN IF NOT EXISTS contact_phone_extension VARCHAR(20);

COMMENT ON COLUMN linksy_provider_applications.contact_phone_extension
  IS 'Phone extension for the application contact phone number';


-- ************************************************************
-- Migration: 20260321000002_create_description_reviews.sql
-- ************************************************************

-- Auto-update provider descriptions: quarterly AI scan + provider review cycle
-- Tracks each review cycle and provider response

CREATE TABLE IF NOT EXISTS linksy_description_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  -- Current description at time of scan
  current_description TEXT,
  -- AI-suggested description from website scan
  ai_suggested_description TEXT,
  -- Status: pending (email sent), accepted_current (no changes), accepted_ai (took AI suggestion),
  --         edited (provider logged in and edited), expired (no response after 30 days)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted_current', 'accepted_ai', 'edited', 'expired', 'error')),
  -- Secure token for email action links (no login required for accept/reject)
  action_token UUID NOT NULL DEFAULT gen_random_uuid(),
  -- When the review was triggered
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- When the provider responded
  responded_at TIMESTAMPTZ,
  -- Who/what triggered: 'cron' or admin user ID
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  -- Error message if AI scan failed
  error_message TEXT,
  -- Batch identifier to group reviews from same cron run
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_description_reviews_provider ON linksy_description_reviews(provider_id);
CREATE INDEX idx_description_reviews_status ON linksy_description_reviews(status) WHERE status = 'pending';
CREATE INDEX idx_description_reviews_token ON linksy_description_reviews(action_token);
CREATE INDEX idx_description_reviews_batch ON linksy_description_reviews(batch_id) WHERE batch_id IS NOT NULL;

-- Add next review date override column to providers
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS next_description_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_description_review_at TIMESTAMPTZ;

COMMENT ON COLUMN linksy_providers.next_description_review_at IS 'Admin override: when to next trigger description review (null = use default quarterly schedule)';
COMMENT ON COLUMN linksy_providers.last_description_review_at IS 'When the last description review was completed';

-- Seed the description_review email template
INSERT INTO linksy_email_templates (template_key, name, description, subject_template, html_template, text_template)
VALUES (
  'description_review',
  'Provider Description Review',
  'Sent quarterly to providers asking them to review their description against AI-scanned website content.',
  'Action Required: Please Review Your {{provider_name}} Description',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #333;">Hello {{contact_name}},</h2>
<p>As part of our quarterly review process, we''ve compared your current provider description in our system with information found on your website. Please review the details below and let us know if any updates are needed.</p>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Your Current Description</h3>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">{{current_description}}</p>
</div>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">AI-Suggested Description (from your website)</h3>
<div style="background: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">{{ai_suggested_description}}</p>
</div>

<p><strong>Please choose one of the following options:</strong></p>

<div style="margin: 20px 0;">
<a href="{{accept_current_url}}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">No Changes Needed</a>
<a href="{{accept_ai_url}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">Use AI Suggestion</a>
<a href="{{edit_url}}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-bottom: 10px;">Log In &amp; Edit</a>
</div>

<p style="color: #666; font-size: 14px;">This link expires in 30 days. If you have any questions, please contact us at {{support_email}}.</p>
<p style="color: #999; font-size: 12px;">Sent by {{app_name}}</p>
</div>',
  'Hello {{contact_name}},

As part of our quarterly review process, we''ve compared your current provider description with information found on your website.

YOUR CURRENT DESCRIPTION:
{{current_description}}

AI-SUGGESTED DESCRIPTION (from your website):
{{ai_suggested_description}}

Please choose one of the following options:
- No Changes Needed: {{accept_current_url}}
- Use AI Suggestion: {{accept_ai_url}}
- Log In & Edit: {{edit_url}}

This link expires in 30 days.
Sent by {{app_name}}'
)
ON CONFLICT (template_key) DO NOTHING;


-- ************************************************************
-- Migration: 20260321000003_call_log_timer_fields.sql
-- ************************************************************

-- Add timer/duration tracking fields to call logs
-- Supports auto-timer (started_at/ended_at set in real-time) and manual entry

ALTER TABLE linksy_call_logs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- Add a check: ended_at must be after started_at when both are present
ALTER TABLE linksy_call_logs
  ADD CONSTRAINT call_log_time_order
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at);

COMMENT ON COLUMN linksy_call_logs.started_at IS 'Call start time — set automatically by timer or manually entered';
COMMENT ON COLUMN linksy_call_logs.ended_at IS 'Call end time — set automatically by timer or manually entered';


-- ************************************************************
-- Migration: 20260321000004_create_referral_alert_config.sql
-- ************************************************************

-- Configurable stale referral alert settings
-- Drives the daily cron that emails designated recipients when referrals stay Pending too long

CREATE TABLE IF NOT EXISTS linksy_referral_alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  threshold_hours integer NOT NULL DEFAULT 48,
  notify_emails text[] NOT NULL DEFAULT '{}',
  notify_site_admins boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id)
);

COMMENT ON TABLE linksy_referral_alert_config IS 'Per-site configuration for automated stale referral email alerts';
COMMENT ON COLUMN linksy_referral_alert_config.threshold_hours IS 'Hours a referral can stay Pending before triggering an alert (e.g. 48 = 2 days)';
COMMENT ON COLUMN linksy_referral_alert_config.notify_emails IS 'Explicit email addresses to notify (in addition to or instead of site admins)';
COMMENT ON COLUMN linksy_referral_alert_config.notify_site_admins IS 'When true, also sends alert to all users with site_admin role';

-- RLS: site admins can read/write
ALTER TABLE linksy_referral_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_admins_manage_referral_alert_config"
  ON linksy_referral_alert_config
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ************************************************************
-- Migration: 20260322000001_add_case_d_duplicate_flag.sql
-- ************************************************************

-- Add case_d (same service category in same week) to duplicate_flag_type check constraint.
-- Also extends Case B semantics from same-day to 30-day window (application-level change).

-- Drop and recreate the check constraint to include 'case_d'
ALTER TABLE linksy_tickets
  DROP CONSTRAINT IF EXISTS linksy_tickets_duplicate_flag_type_check;

ALTER TABLE linksy_tickets
  ADD CONSTRAINT linksy_tickets_duplicate_flag_type_check
    CHECK (duplicate_flag_type IN ('case_a', 'case_b', 'case_c', 'case_d'));

COMMENT ON COLUMN linksy_tickets.duplicate_flag_type IS
  'Duplicate detection flag: case_a=5+ providers same service same day, case_b=same provider+service within 30 days (blocked), case_c=consecutive day same provider, case_d=same service category same week';


-- ************************************************************
-- Migration: 20260322000001_seed_help_docs.sql
-- ************************************************************

-- Migration: Seed Help & Docs articles
-- Adds glossary/role definitions, contact entry instructions, intake specialist guide,
-- referral lifecycle statuses, and referral creation instructions

-- 1. Glossary / Role Definitions
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Glossary & Role Definitions',
  'glossary-role-definitions',
  '<h2>Glossary &amp; Role Definitions</h2>
<p>This guide defines the key roles and terms used throughout the Linksy portal.</p>

<h3>User</h3>
<p>A <strong>User</strong> is any person with login access to the Linksy portal. Users can search for community resources using the Find Help widget and submit referral requests on behalf of clients. All portal members start as a User.</p>

<h3>Intake Specialist</h3>
<p>An <strong>Intake Specialist</strong> (also called an Intake Specialist in the Team Management page) is a staff member at a provider organization who receives and processes incoming referrals. Intake Specialists can:</p>
<ul>
  <li>View and manage referrals assigned to their organization</li>
  <li>Update referral statuses (e.g., In Process, Service Provided, Transferred)</li>
  <li>Add comments and call logs to referrals</li>
  <li>View client contact information for follow-up</li>
</ul>

<h3>Provider Employee</h3>
<p>A <strong>Provider Employee</strong> is a user who has been linked to a provider organization as a contact. Provider Employees can access referrals, contacts, and resources specific to their organization. In the portal, Provider Employees appear on the <strong>Team Management</strong> page of their organization.</p>

<h3>Tenant Admin</h3>
<p>A <strong>Tenant Admin</strong> is an administrator for a specific region or tenant (e.g., Clay County). Tenant Admins have elevated permissions and can:</p>
<ul>
  <li>View all referrals across all providers in their tenant</li>
  <li>Manage provider organizations and their settings</li>
  <li>Add and remove users from the tenant</li>
  <li>Access analytics and reporting dashboards</li>
  <li>Manage the services taxonomy (needs/categories)</li>
  <li>Configure system settings for their tenant</li>
</ul>

<h3>Provider</h3>
<p>A <strong>Provider</strong> is a community organization (nonprofit, government agency, faith-based organization, or business) that offers services to the community. Providers are listed in the Linksy directory and can receive referrals. Each Provider has:</p>
<ul>
  <li>A profile with name, description, and sector classification</li>
  <li>One or more physical locations with addresses</li>
  <li>A list of services (needs) they address</li>
  <li>Contacts (staff) who manage referrals</li>
  <li>Optional: service ZIP codes defining their coverage area</li>
</ul>

<h3>Provider Contact</h3>
<p>A <strong>Provider Contact</strong> is a person associated with a provider organization. Contacts are listed on the provider''s detail page and can be assigned specific roles:</p>
<ul>
  <li><strong>Admin</strong> — Full access to the provider''s referrals, settings, and team management</li>
  <li><strong>User</strong> — Can view and respond to referrals assigned to their provider</li>
</ul>
<p>Provider Contacts receive email notifications when new referrals are submitted to their organization.</p>

<h3>Team Management Page</h3>
<p>The <strong>Team Management</strong> page is where provider administrators manage their organization''s staff. From this page, admins can:</p>
<ul>
  <li>View all Intake Specialists (staff) linked to the provider</li>
  <li>Add new team members by email invitation</li>
  <li>Assign roles (Admin or User) to team members</li>
  <li>Remove team members from the organization</li>
</ul>
<p>To access Team Management, navigate to <strong>My Organization → Team</strong> in the dashboard sidebar.</p>',
  'Definitions of all user roles and key terms in Linksy: User, Provider Employee, Tenant Admin, Provider, Provider Contact, and Team Management.',
  'Getting Started',
  'user',
  true,
  10
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 2. Contact Info Entry Instructions
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Entering Contacts into the Portal',
  'contact-info-entry-instructions',
  '<h2>Entering Contacts into the Portal</h2>
<p>This guide explains how to add and manage contacts (clients and provider employees) in the Linksy portal.</p>

<h3>Adding a New Contact</h3>
<ol>
  <li>Navigate to <strong>Contacts</strong> in the dashboard sidebar.</li>
  <li>Click the <strong>Add Contact</strong> button in the upper right.</li>
  <li>Fill in the required fields:
    <ul>
      <li><strong>First Name</strong> — The contact''s first name (required)</li>
      <li><strong>Last Name</strong> — The contact''s last name (required)</li>
      <li><strong>Email</strong> — A valid email address (required for portal access)</li>
      <li><strong>Phone</strong> — Primary phone number with area code</li>
    </ul>
  </li>
  <li>Select the <strong>Contact Type</strong>:
    <ul>
      <li><strong>Customer</strong> — A community member seeking services</li>
      <li><strong>Provider Employee</strong> — A staff member at a provider organization</li>
    </ul>
  </li>
  <li>Click <strong>Save</strong> to create the contact.</li>
</ol>

<h3>Editing Contact Information</h3>
<ol>
  <li>Navigate to <strong>Contacts</strong> and find the contact you want to edit.</li>
  <li>Click on the contact''s name to open their detail page.</li>
  <li>Update any of the available fields (name, email, phone, etc.).</li>
  <li>Changes save automatically or click <strong>Save</strong> when prompted.</li>
</ol>

<h3>Adding Notes to a Contact</h3>
<ol>
  <li>Open the contact''s detail page.</li>
  <li>Scroll to the <strong>Notes</strong> section.</li>
  <li>Click <strong>Add Note</strong> and type your note.</li>
  <li>Select a note type (General, Outreach, Update, or Internal).</li>
  <li>Click <strong>Save</strong> to attach the note to the contact record.</li>
</ol>

<h3>Searching for Existing Contacts</h3>
<p>Before adding a new contact, always search first to avoid duplicates:</p>
<ul>
  <li>Use the search bar on the Contacts page to search by name, email, or phone number.</li>
  <li>The system performs case-insensitive matching and will flag potential duplicates.</li>
  <li>If a duplicate is found, use the existing record instead of creating a new one.</li>
</ul>

<h3>Tips</h3>
<ul>
  <li>Always include an area code with phone numbers (e.g., 904-555-1234).</li>
  <li>Use the contact''s preferred email address for notifications.</li>
  <li>Mark internal-only information using the <strong>Internal</strong> note type so it is clearly labeled.</li>
</ul>',
  'Step-by-step instructions for adding, editing, and managing contacts in the Linksy portal.',
  'How-To Guides',
  'user',
  true,
  20
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 3. Intake Specialists — Team Management Instructions
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Managing Intake Specialists',
  'managing-intake-specialists',
  '<h2>Managing Intake Specialists</h2>
<p>Intake Specialists are the staff members at your organization who receive and process incoming referrals. This guide covers how to add, manage, and remove Intake Specialists from your team.</p>

<h3>What Is an Intake Specialist?</h3>
<p>An <strong>Intake Specialist</strong> is a provider team member responsible for handling incoming referrals. When a community member submits a referral to your organization, your Intake Specialists receive an email notification and can view, respond to, and update the referral in the portal.</p>
<p><em>Note: In earlier versions of the portal, Intake Specialists were referred to as "staff members." The functionality is the same — only the terminology has been updated.</em></p>

<h3>Adding an Intake Specialist</h3>
<ol>
  <li>Navigate to <strong>My Organization</strong> in the dashboard sidebar.</li>
  <li>Select the <strong>Team</strong> tab.</li>
  <li>Click <strong>Add Team Member</strong> (or <strong>Invite Member</strong>).</li>
  <li>Enter the person''s email address. They must have an existing portal account, or they will receive an invitation to create one.</li>
  <li>Select a role:
    <ul>
      <li><strong>Admin</strong> — Can manage the team, edit organization settings, and handle all referrals</li>
      <li><strong>User</strong> — Can view and respond to referrals but cannot manage team settings</li>
    </ul>
  </li>
  <li>Click <strong>Save</strong> or <strong>Send Invitation</strong>.</li>
</ol>

<h3>Changing an Intake Specialist''s Role</h3>
<ol>
  <li>Go to <strong>My Organization → Team</strong>.</li>
  <li>Find the team member in the list.</li>
  <li>Click the <strong>Edit</strong> button next to their name.</li>
  <li>Change their role between Admin and User.</li>
  <li>Save the changes.</li>
</ol>

<h3>Removing an Intake Specialist</h3>
<ol>
  <li>Go to <strong>My Organization → Team</strong>.</li>
  <li>Find the team member you want to remove.</li>
  <li>Click the <strong>Remove</strong> button.</li>
  <li>Confirm the removal when prompted.</li>
</ol>
<p><strong>Important:</strong> Removing an Intake Specialist does not delete their portal account — it only removes their association with your provider organization. They will no longer receive referral notifications or have access to your organization''s referrals.</p>

<h3>Best Practices</h3>
<ul>
  <li>Ensure at least one Intake Specialist has the <strong>Admin</strong> role so team management is always possible.</li>
  <li>Review your team list regularly and remove anyone who has left the organization.</li>
  <li>When an Intake Specialist goes on extended leave, consider temporarily reassigning their referrals to another team member.</li>
</ul>',
  'How to add, manage, and remove Intake Specialists (team members) who handle incoming referrals for your organization.',
  'How-To Guides',
  'provider_employee',
  true,
  30
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 4. Referral Lifecycle Statuses
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Referral Lifecycle & Statuses',
  'referral-lifecycle-statuses',
  '<h2>Referral Lifecycle &amp; Statuses</h2>
<p>Every referral in Linksy moves through a series of statuses that track its progress from submission to resolution. This guide explains each status and when to use it.</p>

<h3>Status Overview</h3>
<table>
  <thead>
    <tr><th>Status</th><th>Description</th><th>When to Use</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Pending</strong></td>
      <td>The referral has been submitted but not yet reviewed.</td>
      <td>Automatically set when a referral is first created. No action needed.</td>
    </tr>
    <tr>
      <td><strong>In Process</strong></td>
      <td>The referral is actively being worked on by the provider.</td>
      <td>Set this status when you begin working with the client — e.g., you have made initial contact, scheduled an appointment, or started intake procedures.</td>
    </tr>
    <tr>
      <td><strong>Service Provided</strong></td>
      <td>The client''s need has been addressed.</td>
      <td>Set this when you have successfully provided the requested service or connected the client with the appropriate resource.</td>
    </tr>
    <tr>
      <td><strong>Transferred</strong></td>
      <td>The referral has been transferred to a different provider.</td>
      <td>Use this when your organization cannot serve the client and you forward the referral to another provider who can help. The receiving provider will see the referral as "Transferred Pending."</td>
    </tr>
    <tr>
      <td><strong>Transferred Pending</strong></td>
      <td>A referral that was transferred to your organization and is awaiting your review.</td>
      <td>This status is automatically set when another provider transfers a referral to you. Update it to "In Process" once you begin working on it.</td>
    </tr>
    <tr>
      <td><strong>Wrong Org Referred</strong></td>
      <td>The client was referred to the wrong organization.</td>
      <td>Use this when the client''s need does not match the services your organization provides. Consider transferring the referral to the correct provider instead.</td>
    </tr>
    <tr>
      <td><strong>Out of Scope</strong></td>
      <td>The request is outside the scope of services available.</td>
      <td>Use this when the client''s need falls outside what any provider in the network currently offers.</td>
    </tr>
    <tr>
      <td><strong>Not Eligible</strong></td>
      <td>The client does not meet eligibility requirements.</td>
      <td>Use this when the client does not qualify for the requested service due to eligibility criteria (e.g., income level, geographic area, age).</td>
    </tr>
    <tr>
      <td><strong>Unable to Assist</strong></td>
      <td>The provider was unable to assist the client for other reasons.</td>
      <td>Use this as a catch-all when none of the other resolution statuses apply.</td>
    </tr>
    <tr>
      <td><strong>Unresponsive</strong></td>
      <td>The client has not responded to outreach attempts.</td>
      <td>Use this when you have made multiple attempts to contact the client (phone, email) with no response. Document your outreach attempts in the referral comments.</td>
    </tr>
  </tbody>
</table>

<h3>Typical Referral Flow</h3>
<ol>
  <li><strong>Pending</strong> → A new referral arrives</li>
  <li><strong>In Process</strong> → You begin working with the client</li>
  <li><strong>Service Provided</strong> → The client''s need is addressed</li>
</ol>
<p>Alternative paths:</p>
<ul>
  <li><strong>Pending → Transferred</strong> → The referral is forwarded to a more appropriate provider</li>
  <li><strong>Transferred Pending → In Process → Service Provided</strong> → A transferred referral is picked up and resolved</li>
  <li><strong>In Process → Unresponsive</strong> → The client stops responding</li>
  <li><strong>Pending → Wrong Org Referred</strong> → Immediately identified as incorrect</li>
</ul>

<h3>Tips for Status Management</h3>
<ul>
  <li>Always move a referral to <strong>In Process</strong> as soon as you begin working on it. This lets administrators see that the referral is being handled.</li>
  <li>Add a <strong>comment</strong> whenever you change a status to explain why, especially for resolution statuses.</li>
  <li>Use <strong>Transfer</strong> instead of "Wrong Org Referred" when you know which provider should handle the referral — it saves the client from having to resubmit.</li>
  <li>When marking as <strong>Unresponsive</strong>, document your outreach attempts (dates, methods) in the comments.</li>
</ul>',
  'Complete guide to referral statuses including In Process, Transferred, Transferred Pending, and all resolution statuses.',
  'Reference',
  'user',
  true,
  40
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 5. Creating a Referral (with zip code instructions)
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Creating a Referral',
  'creating-a-referral',
  '<h2>Creating a Referral</h2>
<p>This guide walks you through the process of creating a new referral in Linksy, from searching for services to submitting the referral request.</p>

<h3>Step 1: Search for Services</h3>
<ol>
  <li>Navigate to the <strong>Find Help</strong> page (or use the embedded widget on your organization''s website).</li>
  <li>Type a description of the client''s need in the search bar. Use natural language — for example, "need help paying rent" or "food pantry near me."</li>
  <li><strong>Enter a ZIP code</strong> to narrow results to providers serving that area:
    <ul>
      <li>Click the <strong>location pin</strong> icon next to the search bar.</li>
      <li>You can either allow the browser to detect your location automatically, or click <strong>"Enter ZIP code"</strong> to type one manually.</li>
      <li>Enter the client''s ZIP code (e.g., 32043) and click <strong>Set</strong>.</li>
      <li>The search will filter out providers whose service area does not include that ZIP code. Providers with no ZIP code restrictions will still appear.</li>
    </ul>
  </li>
  <li>Review the search results. Each result shows the provider name, matching services, and distance (if location was provided).</li>
</ol>

<h3>Step 2: Select a Provider &amp; Service</h3>
<ol>
  <li>Click on a provider from the search results to view their details.</li>
  <li>Review the provider''s services, locations, and contact information.</li>
  <li>Click <strong>Request Referral</strong> (or <strong>Submit Referral</strong>) on the service that matches the client''s need.</li>
</ol>

<h3>Step 3: Fill Out the Referral Form</h3>
<p>The referral form collects the following information:</p>
<ul>
  <li><strong>Client Name</strong> (optional) — The client can choose to remain anonymous.</li>
  <li><strong>Phone Number</strong> (required if no email) — Include the area code. The provider will use this to follow up.</li>
  <li><strong>Email Address</strong> (required if no phone) — An alternative contact method.</li>
  <li><strong>Additional Details</strong> (optional) — Any extra context about the client''s situation or needs.</li>
</ul>
<p>Some host organizations may have additional custom fields (e.g., date of birth, household size). Fill these in if they appear on the form.</p>

<h3>Step 4: Submit</h3>
<ol>
  <li>Review the information you entered.</li>
  <li>Click <strong>Submit Request</strong>.</li>
  <li>You will receive a <strong>reference number</strong> (e.g., R-2001-07). Save this number for your records.</li>
  <li>The provider''s Intake Specialists will receive an email notification about the new referral.</li>
</ol>

<h3>After Submission</h3>
<p>Once submitted, the referral enters the <strong>Pending</strong> status. The provider''s Intake Specialists will review it and update the status as they work with the client. You can track the referral''s progress in the <strong>Referrals</strong> section of the dashboard.</p>

<h3>Tips</h3>
<ul>
  <li><strong>Always enter a ZIP code</strong> when creating a referral — it helps match the client with providers who serve their area.</li>
  <li>Either a phone number or email address is required. Providing both gives the provider more options for follow-up.</li>
  <li>Use the <strong>Additional Details</strong> field to note any time-sensitive information or special circumstances.</li>
  <li>If the search doesn''t return relevant results, try different wording or broaden your search terms.</li>
</ul>',
  'Step-by-step guide to searching for services, entering a ZIP code, and submitting a referral request.',
  'How-To Guides',
  'user',
  true,
  15
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();


-- ************************************************************
-- Migration: 20260322000002_sla_reminder_system.sql
-- ************************************************************

-- SLA Reminder System
-- Adds per-provider SLA configuration, ticket reminder tracking, and master switch

-- 1. Add SLA configuration columns to providers
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS sla_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS sla_reminder_hours integer NOT NULL DEFAULT 48;

COMMENT ON COLUMN linksy_providers.sla_hours IS 'SLA deadline in hours from ticket creation (default 24 = 1 day)';
COMMENT ON COLUMN linksy_providers.sla_reminder_hours IS 'Hours after ticket creation to send SLA reminder email (default 48 = 2 days)';

-- 2. Add reminder tracking to tickets
ALTER TABLE linksy_tickets
  ADD COLUMN IF NOT EXISTS sla_reminder_sent_at timestamptz;

COMMENT ON COLUMN linksy_tickets.sla_reminder_sent_at IS 'Timestamp when the SLA reminder email was sent for this ticket';

-- 3. Add master switch for SLA reminders to referral_alert_config
ALTER TABLE linksy_referral_alert_config
  ADD COLUMN IF NOT EXISTS sla_reminder_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN linksy_referral_alert_config.sla_reminder_enabled IS 'Master switch for per-provider SLA reminder emails (disabled by default)';

-- 4. Update the SLA trigger to use provider-specific sla_hours
CREATE OR REPLACE FUNCTION linksy_set_sla_due_at()
RETURNS trigger AS $$
DECLARE
  provider_sla_hours integer;
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    IF NEW.provider_id IS NOT NULL THEN
      SELECT sla_hours INTO provider_sla_hours
      FROM linksy_providers WHERE id = NEW.provider_id;
    END IF;
    NEW.sla_due_at := NEW.created_at + make_interval(hours => COALESCE(provider_sla_hours, 24));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Backfill existing providers with defaults (no-op if columns already have defaults)
UPDATE linksy_providers
  SET sla_hours = 24, sla_reminder_hours = 48
  WHERE sla_hours IS NULL OR sla_reminder_hours IS NULL;

-- 6. Backfill sla_due_at for existing pending tickets using provider's SLA hours
-- (Updates tickets that still have the old 48h default to use provider's actual sla_hours)
UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.status = 'pending'
    AND t.sla_due_at IS NOT NULL;

-- Also backfill tickets without sla_due_at
UPDATE linksy_tickets t
  SET sla_due_at = t.created_at + make_interval(hours => COALESCE(p.sla_hours, 24))
  FROM linksy_providers p
  WHERE t.provider_id = p.id
    AND t.sla_due_at IS NULL;

-- Tickets without a provider get the global default
UPDATE linksy_tickets
  SET sla_due_at = created_at + interval '24 hours'
  WHERE sla_due_at IS NULL AND provider_id IS NULL;

