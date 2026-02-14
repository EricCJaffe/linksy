'use client'

import { useMemo } from 'react'
import { isToday, isYesterday, isThisWeek, parseISO } from 'date-fns'
import { CheckCheck, Trash2 } from 'lucide-react'
import { useNotifications, useMarkAllAsRead, type Notification } from '@/lib/hooks/useNotifications'
import { NotificationItem } from './notification-item'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'


interface NotificationGroup {
  label: string
  notifications: Notification[]
}

export function NotificationList() {
  const { data: notifications, isLoading } = useNotifications()
  const { mutate: markAllAsRead, isPending: isMarkingAllRead } = useMarkAllAsRead()

  const groupedNotifications = useMemo(() => {
    if (!notifications) return []

    const groups: NotificationGroup[] = [
      { label: 'Today', notifications: [] },
      { label: 'Yesterday', notifications: [] },
      { label: 'This Week', notifications: [] },
      { label: 'Older', notifications: [] },
    ]

    notifications.forEach((notification) => {
      const date = parseISO(notification.created_at)

      if (isToday(date)) {
        groups[0].notifications.push(notification)
      } else if (isYesterday(date)) {
        groups[1].notifications.push(notification)
      } else if (isThisWeek(date)) {
        groups[2].notifications.push(notification)
      } else {
        groups[3].notifications.push(notification)
      }
    })

    // Filter out empty groups
    return groups.filter((group) => group.notifications.length > 0)
  }, [notifications])

  const hasUnread = notifications?.some((n) => !n.read_at) ?? false

  if (isLoading) {
    return (
      <div className="w-full space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <CheckCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-medium">No notifications</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You're all caught up!
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Notifications</h2>
        <div className="flex gap-2">
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAllRead}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[600px]">
        <div className="space-y-6 p-4">
          {groupedNotifications.map((group) => (
            <div key={group.label} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
