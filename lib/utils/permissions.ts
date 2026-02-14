import type { UserRole, TenantRole } from '@/lib/types/auth'

export type Permission =
  | 'tenants:read'
  | 'tenants:write'
  | 'tenants:delete'
  | 'users:read'
  | 'users:write'
  | 'users:invite'
  | 'users:delete'
  | 'modules:read'
  | 'modules:write'
  | 'settings:read'
  | 'settings:write'
  | 'branding:read'
  | 'branding:write'
  | 'files:read'
  | 'files:write'
  | 'files:delete'
  | 'audit:read'
  | 'notifications:read'
  | 'notifications:write'

const SITE_ADMIN_PERMISSIONS: Permission[] = [
  'tenants:read',
  'tenants:write',
  'tenants:delete',
  'users:read',
  'users:write',
  'users:invite',
  'users:delete',
  'modules:read',
  'modules:write',
  'settings:read',
  'settings:write',
  'branding:read',
  'branding:write',
  'files:read',
  'files:write',
  'files:delete',
  'audit:read',
  'notifications:read',
  'notifications:write',
]

const TENANT_ADMIN_PERMISSIONS: Permission[] = [
  'users:read',
  'users:write',
  'users:invite',
  'users:delete',
  'settings:read',
  'settings:write',
  'branding:read',
  'branding:write',
  'files:read',
  'files:write',
  'files:delete',
  'audit:read',
  'notifications:read',
  'notifications:write',
]

const MEMBER_PERMISSIONS: Permission[] = [
  'settings:read',
  'files:read',
  'files:write',
  'notifications:read',
  'notifications:write',
]

export function getPermissions(userRole: UserRole, tenantRole?: TenantRole): Permission[] {
  if (userRole === 'site_admin') {
    return SITE_ADMIN_PERMISSIONS
  }

  if (tenantRole === 'admin') {
    return TENANT_ADMIN_PERMISSIONS
  }

  return MEMBER_PERMISSIONS
}

export function hasPermission(
  userRole: UserRole,
  tenantRole: TenantRole | undefined,
  permission: Permission
): boolean {
  const permissions = getPermissions(userRole, tenantRole)
  return permissions.includes(permission)
}

export function hasAnyPermission(
  userRole: UserRole,
  tenantRole: TenantRole | undefined,
  permissions: Permission[]
): boolean {
  const userPermissions = getPermissions(userRole, tenantRole)
  return permissions.some(p => userPermissions.includes(p))
}

export function hasAllPermissions(
  userRole: UserRole,
  tenantRole: TenantRole | undefined,
  permissions: Permission[]
): boolean {
  const userPermissions = getPermissions(userRole, tenantRole)
  return permissions.every(p => userPermissions.includes(p))
}
