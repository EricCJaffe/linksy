import type { Json } from './database'

export interface Tenant {
  id: string
  name: string
  slug: string
  settings: TenantSettings
  branding: TenantBranding
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  track_location?: boolean
  primary_contact_id?: string | null
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  terminology?: {
    [key: string]: string
  }
  features?: {
    [key: string]: boolean
  }
  notifications?: {
    email: boolean
    inApp: boolean
  }
  enabled_modules?: string[]
}

export interface TenantBranding {
  logo_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
  font_family?: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: 'admin' | 'member'
  created_at: string
  user?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface CreateTenantInput {
  name: string
  slug: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  track_location?: boolean
  admin_email: string
  admin_name: string
  settings?: TenantSettings
  branding?: TenantBranding
}

export interface UpdateTenantInput {
  name?: string
  slug?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  track_location?: boolean
  primary_contact_id?: string
  settings?: TenantSettings
  branding?: TenantBranding
}
