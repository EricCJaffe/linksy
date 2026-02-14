'use client'

import { useMemo } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { useCurrentTenant } from './useCurrentTenant'
import { useEnabledModules } from './useModules'
import {
  getPermissions,
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  type Permission,
} from '@/lib/utils/permissions'
import type { UserRole, TenantRole } from '@/lib/types/auth'

/**
 * Hook for checking user permissions across the application.
 * Combines user role and tenant role to determine access rights.
 *
 * @returns Object with permission checking functions and role information
 */
export function usePermissions() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser()
  const { data: tenantData, isLoading: isTenantLoading } = useCurrentTenant()
  const { data: enabledModules, isLoading: isModulesLoading } = useEnabledModules(tenantData?.tenant?.id)

  const userRole = user?.profile?.role as UserRole | undefined
  const tenantRole = tenantData?.role as TenantRole | undefined

  // Compute all permissions for the current user
  const permissions = useMemo(() => {
    if (!userRole) return []
    return getPermissions(userRole, tenantRole)
  }, [userRole, tenantRole])

  // Check if user has a specific permission
  const hasPermission = useMemo(
    () => (permission: Permission) => {
      if (!userRole) return false
      return checkPermission(userRole, tenantRole, permission)
    },
    [userRole, tenantRole]
  )

  // Check if user has any of the specified permissions
  const hasAnyPermission = useMemo(
    () => (permissionList: Permission[]) => {
      if (!userRole) return false
      return checkAnyPermission(userRole, tenantRole, permissionList)
    },
    [userRole, tenantRole]
  )

  // Check if user has all of the specified permissions
  const hasAllPermissions = useMemo(
    () => (permissionList: Permission[]) => {
      if (!userRole) return false
      return checkAllPermissions(userRole, tenantRole, permissionList)
    },
    [userRole, tenantRole]
  )

  // Check if user has a specific role
  const hasRole = useMemo(
    () => (role: UserRole | TenantRole) => {
      return userRole === role || tenantRole === role
    },
    [userRole, tenantRole]
  )

  // Check if user can access a specific module
  const canAccessModule = useMemo(
    () => (moduleSlug: string) => {
      // Site admins can access all modules
      if (userRole === 'site_admin') return true

      // Check if module is enabled for the current tenant
      if (!enabledModules) return false

      // enabledModules already filtered by is_enabled, just check slug
      return enabledModules.some(
        (module) => module.slug === moduleSlug
      )
    },
    [userRole, enabledModules]
  )

  // Check if user is admin for a specific module
  const isModuleAdmin = useMemo(
    () => (moduleSlug: string) => {
      // Site admins are admins for all modules
      if (userRole === 'site_admin') return true

      // Tenant admins are admins for enabled modules
      if (tenantRole === 'admin') {
        return canAccessModule(moduleSlug)
      }

      return false
    },
    [userRole, tenantRole, canAccessModule]
  )

  // Convenience role checks
  const isSiteAdmin = userRole === 'site_admin'
  const isTenantAdmin = tenantRole === 'admin'
  const isAdmin = isSiteAdmin || isTenantAdmin
  const isMember = tenantRole === 'member'

  return {
    // Permission checking functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    canAccessModule,
    isModuleAdmin,

    // Role information
    userRole,
    tenantRole,
    isSiteAdmin,
    isTenantAdmin,
    isAdmin,
    isMember,

    // All permissions for the current user
    permissions,

    // Loading states
    isLoading: isUserLoading || isTenantLoading || isModulesLoading,
  }
}
