'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Bell, RefreshCw, Clock } from 'lucide-react'

interface AgingStats {
  total: number
  thresholdHours: number
  buckets: {
    '2-3 days': number
    '3-7 days': number
    '1-2 weeks': number
    '2+ weeks': number
  }
  tickets: Array<{
    id: string
    ticket_number: string
    client_name: string
    provider_name: string
    ageHours: number
    ageDays: number
  }>
}

export function AgingReferralsWidget() {
  const router = useRouter()
  const [stats, setStats] = useState<AgingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [thresholdHours, setThresholdHours] = useState(48)
  const [lastNotified, setLastNotified] = useState<Date | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tickets/aging?threshold_hours=${thresholdHours}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching aging stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [thresholdHours])

  const handleSendNotifications = async () => {
    if (!confirm(`Send email notifications to all site admins about ${stats?.total || 0} aging referrals?`)) {
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/admin/tickets/aging?threshold_hours=${thresholdHours}&send_notifications=true`)
      if (res.ok) {
        const data = await res.json()
        if (data.notificationSent) {
          alert(`Email notifications sent successfully to site admins about ${data.total} aging referral${data.total !== 1 ? 's' : ''}.`)
          setLastNotified(new Date())
        } else {
          alert('No notifications sent. Check that site admin emails are configured.')
        }
      } else {
        alert('Failed to send notifications')
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
      alert('Failed to send notifications')
    } finally {
      setSending(false)
    }
  }

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aging Referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const hasAgingTickets = stats && stats.total > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aging Referrals
              {hasAgingTickets && (
                <Badge variant="destructive" className="ml-2">
                  {stats.total}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Pending referrals older than threshold
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Threshold selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Threshold:</span>
          <Select
            value={thresholdHours.toString()}
            onValueChange={(v) => setThresholdHours(parseInt(v))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="48">48 hours (2 days)</SelectItem>
              <SelectItem value="72">72 hours (3 days)</SelectItem>
              <SelectItem value="168">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!hasAgingTickets ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No pending referrals older than {thresholdHours} hours. Great job!
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Age buckets */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Age Distribution:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2-3 days:</span>
                  <Badge variant="outline">{stats.buckets['2-3 days']}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">3-7 days:</span>
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                    {stats.buckets['3-7 days']}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1-2 weeks:</span>
                  <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                    {stats.buckets['1-2 weeks']}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2+ weeks:</span>
                  <Badge variant="destructive">{stats.buckets['2+ weeks']}</Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/dashboard/tickets?status=pending')}
              >
                View All Pending
              </Button>
              <Button
                size="sm"
                onClick={handleSendNotifications}
                disabled={sending}
                className="flex-1"
              >
                <Bell className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send Alerts'}
              </Button>
            </div>

            {lastNotified && (
              <p className="text-xs text-muted-foreground text-center">
                Last notified: {lastNotified.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
