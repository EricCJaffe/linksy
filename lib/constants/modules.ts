export const MODULE_SLUGS = {
  CORE: 'core',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  FILES: 'files',
  AUDIT: 'audit',
} as const

export const MODULE_NAMES: Record<string, string> = {
  core: 'Core',
  users: 'User Management',
  notifications: 'Notifications',
  files: 'File Storage',
  audit: 'Audit Logs',
}

export const MODULE_ICONS: Record<string, string> = {
  core: 'Home',
  users: 'Users',
  notifications: 'Bell',
  files: 'Folder',
  audit: 'ClipboardList',
}

export const REQUIRED_MODULES: readonly string[] = [MODULE_SLUGS.CORE]

export const DEFAULT_ENABLED_MODULES: readonly string[] = [
  MODULE_SLUGS.CORE,
  MODULE_SLUGS.USERS,
  MODULE_SLUGS.NOTIFICATIONS,
]
