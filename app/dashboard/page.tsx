'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useSlaStats } from '@/lib/hooks/useSla'
import {
  Building2, FileText, LifeBuoy, CheckCircle, AlertCircle,
  History, TrendingUp, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react'
import Link from 'next/link'

interface OverviewStats {
  providers: { total: number }
  referrals: { total: number; open: number; closed: number }
  supportTickets: { total: number; open: number; closed: number }
  needs: { total: number }
}

interface StaleProvider {
  id: string
  name: string
  updated_at: string
  days_stale: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [includeLegacy, setIncludeLegacy] = useState(true)
  const [staleProviders, setStaleProviders] = useState<StaleProvider[]>([])
  const [pendingApps, setPendingApps] = useState(0)

  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const isTenantAdmin = user?.profile?.role === 'tenant_admin'
  const { data: slaData } = useSlaStats()

  useEffect(() => {
    fetchStats()
  }, [includeLegacy])

  useEffect(() => {
    if (isSiteAdmin) {
      fetchStaleProviders()
      fetchPendingApps()
    }
  }, [isSiteAdmin])

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

  const fetchStaleProviders = async () => {
    try {
      const res = await fetch('/api/stats/freshness')
      if (res.ok) {
        const data = await res.json()
        setStaleProviders(data.staleProviders || [])
      }
    } catch {}
  }

  const fetchPendingApps = async () => {
    try {
      const res = await fetch('/api/admin/provider-applications?status=pending')
      if (res.ok) {
        const data = await res.json()
        setPendingApps(data.pagination?.total || data.applications?.length || 0)
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
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

      {/* ===== SITE ADMIN DASHBOARD ===== */}
      {isSiteAdmin && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <>
                    <div className="text-2xl font-bold">{stats?.providers.total || 0}</div>
                    <p className="text-xs text-muted-foreground">Active organizations</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <>
                    <div className="text-2xl font-bold">{stats?.referrals.total || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.referrals.open || 0} open, {stats?.referrals.closed || 0} closed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Referrals</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <>
                    <div className="text-2xl font-bold">{stats?.referrals.open || 0}</div>
                    <p className="text-xs text-muted-foreground">Pending action</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
                <LifeBuoy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
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

          {/* SLA Compliance Widget */}
          {slaData && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{slaData.summary.complianceRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {slaData.summary.metSla}/{slaData.summary.totalResolved} met 48hr SLA (30 days)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SLA Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${slaData.summary.overdueCount > 0 ? 'text-red-600' : ''}`}>
                    {slaData.summary.overdueCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {slaData.summary.approachingCount} approaching deadline
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Referrals</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{slaData.summary.totalPending}</div>
                  <p className="text-xs text-muted-foreground">
                    {slaData.summary.onTrackCount} on track
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alerts row: pending apps + stale providers */}
          <div className="grid gap-4 md:grid-cols-2">
            {pendingApps > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Pending Applications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <strong>{pendingApps}</strong> provider application{pendingApps !== 1 ? 's' : ''} awaiting review.
                  </p>
                  <Link
                    href="/dashboard/admin/provider-applications"
                    className="mt-2 inline-block text-sm font-medium text-amber-700 hover:text-amber-900 underline"
                  >
                    Review now
                  </Link>
                </CardContent>
              </Card>
            )}

            {staleProviders.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-orange-600" />
                    Stale Provider Data
                  </CardTitle>
                  <CardDescription>
                    {staleProviders.length} provider{staleProviders.length !== 1 ? 's' : ''} not updated in 90+ days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {staleProviders.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <Link
                          href={`/dashboard/providers/${p.id}`}
                          className="text-orange-700 hover:underline truncate max-w-[200px]"
                        >
                          {p.name}
                        </Link>
                        <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                          {p.days_stale}d ago
                        </Badge>
                      </div>
                    ))}
                    {staleProviders.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{staleProviders.length - 5} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SLA Overdue tickets list */}
            {slaData && slaData.overdue.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Overdue Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {slaData.overdue.slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <Link
                          href={`/dashboard/tickets/${t.id}`}
                          className="text-red-700 hover:underline"
                        >
                          #{t.ticket_number} {t.client_name && `- ${t.client_name}`}
                        </Link>
                        <Badge variant="destructive" className="text-xs">
                          {Math.abs(t.hours_remaining)}h overdue
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* ===== TENANT ADMIN DASHBOARD ===== */}
      {isTenantAdmin && !isSiteAdmin && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <>
                    <div className="text-2xl font-bold">{stats?.providers.total || 0}</div>
                    <p className="text-xs text-muted-foreground">In your organization</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <>
                    <div className="text-2xl font-bold">{stats?.referrals.total || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.referrals.open || 0} open
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Referrals</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <>
                    <div className="text-2xl font-bold">{stats?.referrals.open || 0}</div>
                    <p className="text-xs text-muted-foreground">Pending action</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
                <LifeBuoy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
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
        </>
      )}

      {/* ===== PROVIDER EMPLOYEE DASHBOARD ===== */}
      {!isSiteAdmin && !isTenantAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Referrals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Assigned to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isSiteAdmin && (
              <>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => router.push('/dashboard/providers')}>
                  <Building2 className="h-4 w-4 mr-2" /> Manage Providers
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => router.push('/dashboard/tickets')}>
                  <FileText className="h-4 w-4 mr-2" /> View Referrals
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => router.push('/dashboard/admin/email-templates')}>
                  <LifeBuoy className="h-4 w-4 mr-2" /> Email Templates
                </Button>
              </>
            )}
            {!isSiteAdmin && (
              <p className="text-sm text-muted-foreground">
                Configure your dashboard to add quick actions
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
