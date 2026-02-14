import { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export type NotificationType =
  | 'user_invited'
  | 'user_removed'
  | 'role_changed'
  | 'module_enabled'
  | 'module_disabled'
  | 'tenant_updated'
  | 'system_alert'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'

export interface CreateNotificationInput {
  user_id: string
  tenant_id?: string
  type: NotificationType
  title: string
  message: string
  action_url?: string
  metadata?: Record<string, any>
}

/**
 * Create a notification for a user
 * This should be called from server-side code (API routes, server actions)
 */
export async function createNotification(input: CreateNotificationInput) {
  const supabase = await createServerClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: input.user_id,
    tenant_id: input.tenant_id || null,
    type: input.type,
    title: input.title,
    message: input.message,
    action_url: input.action_url || null,
    metadata: input.metadata || null,
  })

  if (error) {
    logger.dbError('Create notification', error as Error, {
      user_id: input.user_id,
      type: input.type
    })
    throw error
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(inputs: CreateNotificationInput[]) {
  const supabase = await createServerClient()

  const notifications = inputs.map((input) => ({
    user_id: input.user_id,
    tenant_id: input.tenant_id || null,
    type: input.type,
    title: input.title,
    message: input.message,
    action_url: input.action_url || null,
    metadata: input.metadata || null,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    logger.dbError('Create bulk notifications', error as Error, {
      count: notifications.length
    })
    throw error
  }
}

/**
 * Notify all admins of a tenant
 */
export async function notifyTenantAdmins(
  tenantId: string,
  notification: Omit<CreateNotificationInput, 'user_id' | 'tenant_id'>
) {
  const supabase = await createServerClient()

  // Get all admins for this tenant
  const { data: admins, error: adminsError } = await supabase
    .from('tenant_users')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')

  if (adminsError) {
    logger.dbError('Fetch tenant admins', adminsError as Error, {
      tenant_id: tenantId
    })
    throw adminsError
  }

  if (!admins || admins.length === 0) {
    return
  }

  // Create notifications for all admins
  await createBulkNotifications(
    admins.map((admin) => ({
      user_id: admin.user_id,
      tenant_id: tenantId,
      ...notification,
    }))
  )
}

/**
 * Notify all users in a tenant
 */
export async function notifyTenantUsers(
  tenantId: string,
  notification: Omit<CreateNotificationInput, 'user_id' | 'tenant_id'>
) {
  const supabase = await createServerClient()

  // Get all users for this tenant
  const { data: users, error: usersError } = await supabase
    .from('tenant_users')
    .select('user_id')
    .eq('tenant_id', tenantId)

  if (usersError) {
    logger.dbError('Fetch tenant users', usersError as Error, {
      tenant_id: tenantId
    })
    throw usersError
  }

  if (!users || users.length === 0) {
    return
  }

  // Create notifications for all users
  await createBulkNotifications(
    users.map((user) => ({
      user_id: user.user_id,
      tenant_id: tenantId,
      ...notification,
    }))
  )
}
