// Common database query result types
// These are used throughout the app for Supabase query type annotations

// Supabase Database type - this would normally be auto-generated
// For now, using a permissive type to allow all operations
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Using 'any' to allow all Supabase operations without strict type checking
// In production, this should be generated from the Supabase schema
export type Database = any

export interface UserRole {
  role: 'site_admin' | 'tenant_admin' | 'user'
}

export interface TenantUserRole {
  role: 'admin' | 'member'
}

export interface TenantUserId {
  tenant_id: string
}

export interface TenantUserData {
  tenant_id: string
  role: 'admin' | 'member'
}

export interface IdOnly {
  id: string
}

export interface TenantSlug {
  name: string
  slug: string
}

export interface FileOwnership {
  tenant_id: string
  uploaded_by: string
}
