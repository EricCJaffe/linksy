'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { AgingReferralsWidget } from '@/components/admin/aging-referrals-widget'
import { PendingImportsWidget } from '@/components/admin/pending-imports-widget'
import { Building2, FileText, LifeBuoy, CheckCircle, AlertCircle, History, TrendingUp } from 'lucide-react'

interface OverviewStats {
  providers: { total: number }
  referrals: { total: number; open: number; closed: number }
  supportTickets: { total: number; open: number; closed: number }
  needs: { total: number }
}

export default function DashboardPage() {
  const { data: user } = useCurrentUser()
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [includeLegacy, setIncludeLegacy] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [includeLegacy])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (includeLegacy) params.set('includeLegacy', 'true')

      const res = await fetch(`/api/stats/overview?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isSiteAdmin = user?.profile?.role === 'site_admin'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.profile?.full_name || 'User'}
          </p>
        </div>
        {isSiteAdmin && (
          <div className="flex gap-2">
            <Button
              variant={!includeLegacy ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIncludeLegacy(false)}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Since Launch
            </Button>
            <Button
              variant={includeLegacy ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIncludeLegacy(true)}
            >
              <History className="h-4 w-4 mr-2" />
              All Time
            </Button>
          </div>
        )}
      </div>

      {isSiteAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.providers.total || 0}</div>
                  <p className="text-xs text-muted-foreground">Active organizations</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.referrals.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.referrals.open || 0} open, {stats?.referrals.closed || 0} closed
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-accent/60 bg-gradient-to-b from-accent/30 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Referrals</CardTitle>
              <AlertCircle className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.referrals.open || 0}</div>
                  <p className="text-xs text-muted-foreground">Pending action</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-secondary/70 bg-gradient-to-b from-secondary to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
              <LifeBuoy className="h-4 w-4 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.supportTickets.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.supportTickets.open || 0} open
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!isSiteAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Referrals</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Assigned to you</p>
            </CardContent>
          </Card>

          <Card className="border-accent/60 bg-gradient-to-b from-accent/30 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/70 bg-gradient-to-b from-secondary to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isSiteAdmin ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </CardContent>
          </Card>
          <AgingReferralsWidget />
          <PendingImportsWidget />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </CardContent>
          </Card>
          <Card className="border-accent/60">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure your dashboard to add quick actions
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
