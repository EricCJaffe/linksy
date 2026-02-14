import type { User as SupabaseUser } from '@supabase/supabase-js'

export type UserRole = 'site_admin' | 'tenant_admin' | 'user'
export type TenantRole = 'admin' | 'member'

export interface User extends SupabaseUser {
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  timezone?: string | null
  theme?: 'light' | 'dark' | 'system' | null
  language?: string | null
  email_notifications?: boolean
  push_notifications?: boolean
  created_at: string
  updated_at: string
}

export interface AuthSession {
  user: User
  profile: UserProfile
  currentTenant: TenantMembership | null
  tenants: TenantMembership[]
}

export interface TenantMembership {
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  role: TenantRole
}

export interface Invitation {
  id: string
  tenant_id: string
  email: string
  role: TenantRole
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  tenant?: {
    name: string
    slug: string
  }
}
