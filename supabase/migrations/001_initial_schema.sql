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
