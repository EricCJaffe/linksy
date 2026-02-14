import type { UserRole, TenantRole } from '@/lib/types/auth'

export function isSiteAdmin(role: UserRole): boolean {
  return role === 'site_admin'
}

export function isTenantAdmin(role: TenantRole): boolean {
  return role === 'admin'
}

export function canManageTenant(userRole: UserRole, tenantRole?: TenantRole): boolean {
  return userRole === 'site_admin' || tenantRole === 'admin'
}

export function canManageUsers(userRole: UserRole, tenantRole?: TenantRole): boolean {
  return userRole === 'site_admin' || tenantRole === 'admin'
}

export function canAccessAdminPanel(userRole: UserRole): boolean {
  return userRole === 'site_admin'
}

export function getRedirectPath(userRole: UserRole, hasMultipleTenants: boolean): string {
  if (userRole === 'site_admin') {
    return '/admin/tenants'
  }
  if (hasMultipleTenants) {
    return '/dashboard'
  }
  return '/dashboard'
}

export function generateInviteToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function getInviteExpirationDate(days: number = 7): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
