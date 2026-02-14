import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export interface Activity {
  id: string
  tenant_id: string | null
  user_id: string
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, any> | null
  created_at: string
  user?: {
    email: string
    profile?: {
      full_name: string | null
      avatar_url: string | null
    }
  }
}

/**
 * Log an activity to the audit logs table
 * This can be called after major actions to create activity feed entries
 */
export async function logActivity(
  tenantId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  details?: Record<string, any> | null
): Promise<void> {
  try {
    const supabase = createClient()

    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    })
  } catch (error) {
    logger.error(
      'Failed to log activity',
      error instanceof Error ? error : new Error('Unknown error'),
      { action, resource_type: resourceType }
    )
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Format an activity into a human-readable description
 */
export function formatActivityDescription(activity: Activity): string {
  const userName = activity.user?.profile?.full_name || activity.user?.email || 'Someone'
  const action = activity.action
  const resourceType = activity.resource_type
  const details = activity.details

  // User actions
  if (action === 'user.created') {
    return `${userName} joined the team`
  }
  if (action === 'user.invited') {
    const invitedEmail = details?.email || 'a new user'
    return `${userName} invited ${invitedEmail}`
  }
  if (action === 'user.updated') {
    if (details?.role_changed) {
      return `${userName} changed ${details.target_user || 'a user'}'s role to ${details.new_role}`
    }
    return `${userName} updated their profile`
  }
  if (action === 'user.deleted') {
    return `${userName} removed ${details?.target_user || 'a user'} from the team`
  }

  // Tenant actions
  if (action === 'tenant.created') {
    return `${userName} created the workspace`
  }
  if (action === 'tenant.updated') {
    return `${userName} updated workspace settings`
  }

  // Module actions
  if (action === 'module.enabled') {
    const moduleName = details?.module_name || 'a module'
    return `${userName} enabled ${moduleName}`
  }
  if (action === 'module.disabled') {
    const moduleName = details?.module_name || 'a module'
    return `${userName} disabled ${moduleName}`
  }

  // Role actions
  if (action === 'role.changed') {
    const targetUser = details?.target_user || 'a user'
    const newRole = details?.new_role || 'a new role'
    return `${userName} changed ${targetUser}'s role to ${newRole}`
  }

  // File actions
  if (action === 'file.uploaded') {
    const fileName = details?.file_name || 'a file'
    return `${userName} uploaded ${fileName}`
  }
  if (action === 'file.deleted') {
    const fileName = details?.file_name || 'a file'
    return `${userName} deleted ${fileName}`
  }
  if (action === 'file.shared') {
    const fileName = details?.file_name || 'a file'
    return `${userName} shared ${fileName}`
  }

  // Auth actions
  if (action === 'login') {
    return `${userName} signed in`
  }
  if (action === 'logout') {
    return `${userName} signed out`
  }

  // Default fallback
  return `${userName} performed ${action} on ${resourceType}`
}

/**
 * Get an icon name for an activity type
 */
export function getActivityIcon(activity: Activity): string {
  const action = activity.action

  // User actions
  if (action.startsWith('user.')) {
    if (action === 'user.created') return 'UserPlus'
    if (action === 'user.invited') return 'Mail'
    if (action === 'user.updated') return 'UserCheck'
    if (action === 'user.deleted') return 'UserMinus'
    return 'User'
  }

  // Tenant actions
  if (action.startsWith('tenant.')) {
    return 'Building2'
  }

  // Module actions
  if (action.startsWith('module.')) {
    if (action === 'module.enabled') return 'ToggleRight'
    if (action === 'module.disabled') return 'ToggleLeft'
    return 'Package'
  }

  // Role actions
  if (action === 'role.changed') {
    return 'Shield'
  }

  // File actions
  if (action.startsWith('file.')) {
    if (action === 'file.uploaded') return 'Upload'
    if (action === 'file.deleted') return 'Trash2'
    if (action === 'file.shared') return 'Share2'
    return 'File'
  }

  // Auth actions
  if (action === 'login') return 'LogIn'
  if (action === 'logout') return 'LogOut'

  // Default
  return 'Activity'
}

/**
 * Get a color class for an activity type
 */
export function getActivityColor(activity: Activity): string {
  const action = activity.action

  if (
    action === 'user.created' ||
    action === 'user.invited' ||
    action === 'module.enabled' ||
    action === 'file.uploaded'
  ) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }

  if (action === 'user.deleted' || action === 'module.disabled' || action === 'file.deleted') {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  if (action === 'user.updated' || action === 'tenant.updated' || action === 'role.changed') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }

  if (action === 'file.shared') {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  }

  if (action === 'login' || action === 'logout') {
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
}
