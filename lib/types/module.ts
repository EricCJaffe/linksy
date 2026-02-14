export interface Module {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface TenantModule {
  id: string
  tenant_id: string
  module_id: string
  is_enabled: boolean
  created_at: string
  module?: Module
}

export interface ModuleConfig {
  slug: string
  name: string
  description: string
  icon: string
  routes: string[]
  permissions: string[]
}

export const DEFAULT_MODULES: ModuleConfig[] = [
  {
    slug: 'core',
    name: 'Core',
    description: 'Core functionality including dashboard and settings',
    icon: 'home',
    routes: ['/dashboard', '/dashboard/settings'],
    permissions: ['read', 'write'],
  },
  {
    slug: 'users',
    name: 'User Management',
    description: 'Manage users and invitations',
    icon: 'users',
    routes: ['/dashboard/settings/users'],
    permissions: ['users:read', 'users:write', 'users:invite'],
  },
  {
    slug: 'notifications',
    name: 'Notifications',
    description: 'In-app and email notifications',
    icon: 'bell',
    routes: ['/dashboard/notifications'],
    permissions: ['notifications:read', 'notifications:write'],
  },
  {
    slug: 'files',
    name: 'File Storage',
    description: 'File upload and management',
    icon: 'folder',
    routes: ['/dashboard/files'],
    permissions: ['files:read', 'files:write', 'files:delete'],
  },
  {
    slug: 'audit',
    name: 'Audit Logs',
    description: 'Track and view all system activities',
    icon: 'clipboard-list',
    routes: ['/dashboard/admin/audit-logs'],
    permissions: ['audit:read'],
  },
]
