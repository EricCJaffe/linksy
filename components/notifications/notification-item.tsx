'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  UserPlus,
  UserMinus,
  Shield,
  Package,
  Building2,
  Circle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { useToggleRead, useDeleteNotification, type Notification } from '@/lib/hooks/useNotifications'

const NOTIFICATION_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  user_invited: UserPlus,
  user_removed: UserMinus,
  role_changed: Shield,
  module_enabled: Package,
  module_disabled: Package,
  tenant_updated: Building2,
  system_alert: Bell,
}

const NOTIFICATION_COLORS = {
  success: 'text-green-600 bg-green-50 dark:bg-green-950',
  error: 'text-red-600 bg-red-50 dark:bg-red-950',
  warning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
  info: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  user_invited: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  user_removed: 'text-red-600 bg-red-50 dark:bg-red-950',
  role_changed: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
  module_enabled: 'text-green-600 bg-green-50 dark:bg-green-950',
  module_disabled: 'text-gray-600 bg-gray-50 dark:bg-gray-950',
  tenant_updated: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  system_alert: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
}

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter()
  const { mutate: toggleRead } = useToggleRead()
  const { mutate: deleteNotification } = useDeleteNotification()

  const Icon = NOTIFICATION_ICONS[notification.type as keyof typeof NOTIFICATION_ICONS] || Bell
  const iconColor = NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] || NOTIFICATION_COLORS.info

  const handleClick = () => {
    // Mark as read when clicked
    if (!notification.read_at) {
      toggleRead({ id: notification.id, read: true })
    }

    // Navigate if there's an action URL
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleRead({ id: notification.id, read: !notification.read_at })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNotification(notification.id)
  }

  return (
    <div
      className={cn(
        'group relative flex gap-3 rounded-lg border p-4 transition-colors',
        notification.action_url && 'cursor-pointer hover:bg-muted/50',
        !notification.read_at && 'bg-muted/30'
      )}
      onClick={handleClick}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{notification.title}</p>
            {!notification.read_at && (
              <Circle className="h-2 w-2 fill-primary text-primary" />
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{notification.message}</p>

        {notification.action_url && (
          <p className="text-xs text-primary">
            Click to view details
          </p>
        )}
      </div>

      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleToggleRead}
          title={notification.read_at ? 'Mark as unread' : 'Mark as read'}
        >
          {notification.read_at ? (
            <Circle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={handleDelete}
          title="Delete notification"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
