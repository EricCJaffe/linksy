export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  RESET_PASSWORD: '/reset-password',

  // Dashboard
  DASHBOARD: '/dashboard',
  NOTIFICATIONS: '/dashboard/notifications',

  // Settings
  SETTINGS: '/dashboard/settings',
  SETTINGS_PROFILE: '/dashboard/settings/profile',
  SETTINGS_COMPANY: '/dashboard/settings/company',
  SETTINGS_BRANDING: '/dashboard/settings/branding',
  SETTINGS_USERS: '/dashboard/settings/users',

  // Admin (Site Admin only)
  ADMIN: '/dashboard/admin',
  ADMIN_TENANTS: '/dashboard/admin/tenants',
  ADMIN_MODULES: '/dashboard/admin/modules',
  ADMIN_AUDIT_LOGS: '/dashboard/admin/audit-logs',

  // API
  API_AUTH_CALLBACK: '/api/auth/callback',
  API_TENANTS: '/api/tenants',
  API_USERS: '/api/users',
  API_MODULES: '/api/modules',
  API_INVITATIONS: '/api/invitations',
  API_FILES: '/api/files',
  API_SEARCH: '/api/search',
} as const

export const PROTECTED_ROUTES: readonly string[] = [
  ROUTES.DASHBOARD,
  ROUTES.NOTIFICATIONS,
  ROUTES.SETTINGS,
  ROUTES.SETTINGS_PROFILE,
  ROUTES.SETTINGS_COMPANY,
  ROUTES.SETTINGS_BRANDING,
  ROUTES.SETTINGS_USERS,
  ROUTES.ADMIN,
  ROUTES.ADMIN_TENANTS,
  ROUTES.ADMIN_MODULES,
  ROUTES.ADMIN_AUDIT_LOGS,
]

export const ADMIN_ROUTES: readonly string[] = [
  ROUTES.ADMIN,
  ROUTES.ADMIN_TENANTS,
  ROUTES.ADMIN_MODULES,
  ROUTES.ADMIN_AUDIT_LOGS,
]

export const TENANT_ADMIN_ROUTES: readonly string[] = [
  ROUTES.SETTINGS_COMPANY,
  ROUTES.SETTINGS_BRANDING,
  ROUTES.SETTINGS_USERS,
]
