/**
 * Centralized authorization middleware for API routes
 * Provides reusable functions for authentication and authorization checks
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface AuthUser {
  id: string
  email: string
  role: 'site_admin' | 'tenant_admin' | 'user'
}

export interface TenantMembership {
  tenant_id: string
  role: 'admin' | 'member'
}

export interface AuthContext {
  user: AuthUser
  tenantMembership?: TenantMembership
  isSiteAdmin: boolean
  isTenantAdmin: boolean
}

/**
 * Get authenticated user or return 401 error
 */
export async function requireAuth(): Promise<
  { data: AuthContext; error: null } | { data: null; error: NextResponse }
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      data: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .single<{ role: 'site_admin' | 'tenant_admin' | 'user'; email: string }>()

  if (!profile) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'User profile not found' },
        { status: 403 }
      ),
    }
  }

  // Get tenant membership
  const { data: tenantMembership } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .maybeSingle<{ tenant_id: string; role: 'admin' | 'member' }>()

  const authContext: AuthContext = {
    user: {
      id: user.id,
      email: profile.email,
      role: profile.role,
    },
    tenantMembership: tenantMembership || undefined,
    isSiteAdmin: profile.role === 'site_admin',
    isTenantAdmin: tenantMembership?.role === 'admin',
  }

  return { data: authContext, error: null }
}

/**
 * Require user to be a site admin
 */
export async function requireSiteAdmin(): Promise<
  { data: AuthContext; error: null } | { data: null; error: NextResponse }
> {
  const result = await requireAuth()

  if (result.error) {
    return result
  }

  if (!result.data.isSiteAdmin) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Site admin access required' },
        { status: 403 }
      ),
    }
  }

  return result
}

/**
 * Require user to be a tenant admin (or site admin)
 */
export async function requireTenantAdmin(): Promise<
  { data: AuthContext; error: null } | { data: null; error: NextResponse }
> {
  const result = await requireAuth()

  if (result.error) {
    return result
  }

  if (!result.data.isSiteAdmin && !result.data.isTenantAdmin) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    }
  }

  return result
}

/**
 * Require user to have a tenant membership
 */
export async function requireTenantMembership(): Promise<
  { data: AuthContext; error: null } | { data: null; error: NextResponse }
> {
  const result = await requireAuth()

  if (result.error) {
    return result
  }

  if (!result.data.tenantMembership) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'User not associated with any organization' },
        { status: 403 }
      ),
    }
  }

  return result
}

/**
 * Check if user has access to a specific tenant
 */
export async function requireTenantAccess(
  tenantId: string
): Promise<
  { data: AuthContext; error: null } | { data: null; error: NextResponse }
> {
  const result = await requireTenantMembership()

  if (result.error) {
    return result
  }

  // Site admins have access to all tenants
  if (result.data.isSiteAdmin) {
    return result
  }

  // Check if user's tenant matches
  if (result.data.tenantMembership?.tenant_id !== tenantId) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden - Access to this organization denied' },
        { status: 403 }
      ),
    }
  }

  return result
}

/**
 * Helper to extract tenant ID from auth context
 */
export function getTenantId(context: AuthContext): string | null {
  return context.tenantMembership?.tenant_id || null
}

/**
 * Helper to check if user can perform admin actions in their tenant
 */
export function canManageTenant(context: AuthContext): boolean {
  return context.isSiteAdmin || context.isTenantAdmin
}

/**
 * Helper to check if user can manage a specific resource
 * @param context - Auth context
 * @param resourceOwnerId - ID of the user who owns the resource
 */
export function canManageResource(
  context: AuthContext,
  resourceOwnerId: string
): boolean {
  return (
    context.user.id === resourceOwnerId ||
    context.isSiteAdmin ||
    context.isTenantAdmin
  )
}
