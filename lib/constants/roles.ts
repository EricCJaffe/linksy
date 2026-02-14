export const USER_ROLES = {
  SITE_ADMIN: 'site_admin',
  TENANT_ADMIN: 'tenant_admin',
  USER: 'user',
} as const

export const TENANT_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const

export const ROLE_LABELS: Record<string, string> = {
  site_admin: 'Site Administrator',
  tenant_admin: 'Tenant Administrator',
  user: 'User',
  admin: 'Administrator',
  member: 'Member',
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  site_admin: 'Full access to all tenants and system settings',
  tenant_admin: 'Can manage tenant settings and users',
  user: 'Standard user with limited permissions',
  admin: 'Can manage tenant settings and invite users',
  member: 'Standard tenant member',
}
