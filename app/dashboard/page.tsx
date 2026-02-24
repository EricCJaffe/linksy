'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useMyProviderStats } from '@/lib/hooks/useMyProviderStats'
import { AgingReferralsWidget } from '@/components/admin/aging-referrals-widget'
import { PendingImportsWidget } from '@/components/admin/pending-imports-widget'
import { Building2, FileText, LifeBuoy, CheckCircle, AlertCircle, History, TrendingUp, MapPin, Phone, Mail, Globe } from 'lucide-react'

interface OverviewStats {
  providers: { total: number }
  referrals: { total: number; open: number; closed: number }
  supportTickets: { total: number; open: number; closed: number }
  needs: { total: number }
}

export default function DashboardPage() {
  const { data: user } = useCurrentUser()
  const { data: providerStats, isLoading: isProviderStatsLoading } = useMyProviderStats()
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
  const isProviderUser = providerStats?.hasAccess && !isSiteAdmin

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
        <>
          {/* Provider Organization Info */}
          {isProviderUser && providerStats?.provider && (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{providerStats.provider.name}</CardTitle>
                    <CardDescription className="mt-1">Your Organization</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={providerStats.provider.is_active ? 'default' : 'secondary'}>
                      {providerStats.provider.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant={providerStats.provider.accepting_referrals ? 'default' : 'outline'}>
                      {providerStats.provider.accepting_referrals ? 'Accepting Referrals' : 'Not Accepting'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {providerStats.provider.description && (
                  <p className="text-sm text-muted-foreground">{providerStats.provider.description}</p>
                )}
                <div className="grid gap-3 text-sm">
                  {providerStats.provider.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div>{providerStats.provider.address}</div>
                        {providerStats.provider.city && (
                          <div>
                            {providerStats.provider.city}, {providerStats.provider.state} {providerStats.provider.zip}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {providerStats.provider.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${providerStats.provider.phone}`} className="hover:underline">
                        {providerStats.provider.phone}
                      </a>
                    </div>
                  )}
                  {providerStats.provider.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${providerStats.provider.email}`} className="hover:underline">
                        {providerStats.provider.email}
                      </a>
                    </div>
                  )}
                  {providerStats.provider.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={providerStats.provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {providerStats.provider.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Referral Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Referrals</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {isProviderStatsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{providerStats?.personalStats?.total || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {providerStats?.personalStats?.thisMonth || 0} this month
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-accent/60 bg-gradient-to-b from-accent/30 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-accent-foreground" />
              </CardHeader>
              <CardContent>
                {isProviderStatsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {(providerStats?.personalStats?.pending || 0) + (providerStats?.personalStats?.in_progress || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Needs attention</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-secondary/70 bg-gradient-to-b from-secondary to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-secondary-foreground" />
              </CardHeader>
              <CardContent>
                {isProviderStatsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {(providerStats?.personalStats?.resolved || 0) + (providerStats?.personalStats?.closed || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Organization Stats */}
          {isProviderUser && providerStats?.orgStats && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Organization Referrals</CardTitle>
                <CardDescription>All referrals for {providerStats.provider?.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {isProviderStatsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="text-2xl font-bold">{providerStats.orgStats.total}</div>
                      <p className="text-xs text-muted-foreground">Total Referrals</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {providerStats.orgStats.pending}
                      </div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {providerStats.orgStats.in_progress}
                      </div>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {providerStats.orgStats.resolved + providerStats.orgStats.closed}
                      </div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
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
