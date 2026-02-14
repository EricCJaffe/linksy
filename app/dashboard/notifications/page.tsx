import { NotificationList } from '@/components/notifications/notification-list'

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Stay updated with your latest notifications</p>
      </div>

      <NotificationList />
    </div>
  )
}
