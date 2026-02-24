'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, TrendingUp, Users, BarChart3, History, Search, Phone, Globe, AlertTriangle, Navigation, MapPin, Clock, GitMerge, PieChart as PieChartIcon } from 'lucide-react'
import {
  MonthlyTrendsChart as RechartsMonthlyChart,
  CategoryBreakdownChart,
  StatusPieChart,
  TopProvidersChart,
  SourceBreakdownChart,
} from '@/components/analytics/report-charts'

interface FunnelData {
  totalSessions: number
  engagedSessions: number
  convertedSessions: number
  engagementRate: number
  conversionRate: number
  engagedConversionRate: number
}

interface SearchAnalyticsData {
  totalSessions: number
  sessionsLast30Days: number
  totalInteractions: number
  totalCrisisDetections: number
  monthlySearchTrend: { month: string; count: number }[]
  interactionsByType: { type: string; count: number }[]
  topProvidersByInteraction: { id: string; name: string; count: number }[]
  crisisBreakdown: { type: string; count: number }[]
  recentCrisisSessions: { id: string; crisis_type: string | null; created_at: string }[]
  funnel: FunnelData
  topZipCodes: { zip_code: string; count: number }[]
}

interface TimeToResolution {
  avgDays: number | null
  totalResolved: number
  byStatus: { status: string; avg_days: number; count: number }[]
}

interface ReportsData {
  referralsByCategory: { name: string; count: number }[]
  topReferrers: { id: string; name: string; count: number }[]
  referralsByStatus: { status: string; count: number }[]
  referralsBySource: { source: string; count: number }[]
  monthlyTrends: { month: string; count: number }[]
  recentActivity: { last30Days: number }
  timeToResolution: TimeToResolution
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  customer_need_addressed: 'Need Addressed',
  wrong_organization_referred: 'Wrong Organization',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Client Unresponsive',
}

const statusColors: Record<string, string> = {
  pending: 'bg-blue-500',
  customer_need_addressed: 'bg-green-500',
  wrong_organization_referred: 'bg-orange-500',
  outside_of_scope: 'bg-gray-400',
  client_not_eligible: 'bg-gray-400',
  unable_to_assist: 'bg-red-400',
  client_unresponsive: 'bg-gray-400',
}

function BarChart({ items, colorClass = 'bg-primary' }: {
  items: { label: string; count: number }[]
  colorClass?: string
}) {
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-right text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all ${colorClass}`}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-sm font-semibold text-right">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

function MonthlyTrendChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const heightPct = (d.count / max) * 100
        const label = new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex items-end justify-center h-24">
              <div
                className="w-full bg-primary rounded-t transition-all group-hover:bg-primary/80"
                style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 0)}%` }}
                title={`${label}: ${d.count}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground rotate-45 origin-left translate-y-1">
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const CRISIS_LABELS: Record<string, string> = {
  suicide: 'Suicide & Crisis',
  domestic_violence: 'Domestic Violence',
  trafficking: 'Human Trafficking',
  child_abuse: 'Child Abuse',
}

const INTERACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  phone_click: { label: 'Phone Calls', icon: <Phone className="h-3 w-3" /> },
  website_click: { label: 'Website Visits', icon: <Globe className="h-3 w-3" /> },
  directions_click: { label: 'Directions', icon: <Navigation className="h-3 w-3" /> },
  profile_view: { label: 'Profile Views', icon: <Search className="h-3 w-3" /> },
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'referrals' | 'search' | 'charts' | 'reassignments'>('referrals')
  const [data, setData] = useState<ReportsData | null>(null)
  const [searchData, setSearchData] = useState<SearchAnalyticsData | null>(null)
  const [reassignmentData, setReassignmentData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeLegacy, setIncludeLegacy] = useState(true)

  useEffect(() => { fetchReports() }, [includeLegacy])
  useEffect(() => { fetchSearchAnalytics() }, [])
  useEffect(() => { if (activeTab === 'reassignments') fetchReassignmentStats() }, [activeTab])

  const fetchReports = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (includeLegacy) params.set('includeLegacy', 'true')
      const res = await fetch(`/api/stats/reports?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSearchAnalytics = async () => {
    setSearchLoading(true)
    try {
      const res = await fetch('/api/stats/search-analytics')
      if (res.ok) setSearchData(await res.json())
    } catch {
      // non-fatal
    } finally {
      setSearchLoading(false)
    }
  }

  const fetchReassignmentStats = async () => {
    try {
      const res = await fetch('/api/admin/reports/reassignments')
      if (res.ok) setReassignmentData(await res.json())
    } catch {
      // non-fatal
    }
  }

  if (error && activeTab === 'referrals') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const totalReferrals = data?.referralsByStatus.reduce((s, i) => s + i.count, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Insights and trends across the platform
          </p>
        </div>
        {activeTab === 'referrals' && (
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

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-primary/20">
        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'referrals'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Referrals
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'search'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="h-4 w-4 inline mr-1.5" />
          Search & AI
          {(searchData?.totalCrisisDetections ?? 0) > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">{searchData!.totalCrisisDetections}</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'charts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PieChartIcon className="h-4 w-4 inline mr-1.5" />
          Visual Charts
        </button>
        <button
          onClick={() => setActiveTab('reassignments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reassignments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GitMerge className="h-4 w-4 inline mr-1.5" />
          Reassignments
        </button>
      </div>

      {/* Search & AI Analytics Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Summary stat cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {searchLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : searchData ? (
              <>
                <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Searches</p>
                    <p className="text-4xl font-bold mt-1">{searchData.totalSessions.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                    <p className="text-4xl font-bold mt-1">{searchData.sessionsLast30Days.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-accent/60 bg-gradient-to-b from-accent/30 to-white">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Provider Interactions</p>
                    <p className="text-4xl font-bold mt-1">{searchData.totalInteractions.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className={searchData.totalCrisisDetections > 0 ? 'border-red-300' : 'border-primary/20'}>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      Crisis Detections
                    </p>
                    <p className="text-4xl font-bold mt-1 text-red-600">{searchData.totalCrisisDetections}</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Monthly search trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Searches (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : searchData && searchData.monthlySearchTrend.length > 0 ? (
                <MonthlyTrendChart data={searchData.monthlySearchTrend} />
              ) : (
                <p className="text-sm text-muted-foreground">No search data yet</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Interaction types */}
            <Card>
              <CardHeader>
                <CardTitle>Interaction Types</CardTitle>
                <p className="text-sm text-muted-foreground">How users engage with provider cards</p>
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : searchData && searchData.interactionsByType.length > 0 ? (
                  <div className="space-y-3">
                    {searchData.interactionsByType.map((item) => {
                      const meta = INTERACTION_LABELS[item.type]
                      const max = searchData.interactionsByType[0]?.count || 1
                      return (
                        <div key={item.type} className="flex items-center gap-3">
                          <span className="w-36 shrink-0 text-sm text-right text-muted-foreground flex items-center justify-end gap-1">
                            {meta?.icon}{meta?.label ?? item.type}
                          </span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-primary rounded" style={{ width: `${(item.count / max) * 100}%` }} />
                          </div>
                          <span className="w-8 shrink-0 text-sm font-semibold text-right">{item.count}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No interactions yet</p>
                )}
              </CardContent>
            </Card>

            {/* Crisis breakdown */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Crisis Detections
                </CardTitle>
                <p className="text-sm text-muted-foreground">By crisis type (all time)</p>
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : searchData && searchData.crisisBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {searchData.crisisBreakdown.map((item) => {
                      const max = searchData.crisisBreakdown[0]?.count || 1
                      return (
                        <div key={item.type} className="flex items-center gap-3">
                          <span className="w-36 shrink-0 text-sm text-right text-muted-foreground">
                            {CRISIS_LABELS[item.type] ?? item.type}
                          </span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-red-500 rounded" style={{ width: `${(item.count / max) * 100}%` }} />
                          </div>
                          <span className="w-8 shrink-0 text-sm font-semibold text-right">{item.count}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No crisis detections recorded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top providers by interaction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Providers by Engagement
              </CardTitle>
              <p className="text-sm text-muted-foreground">Providers users interact with most (calls, visits, directions)</p>
            </CardHeader>
            <CardContent>
              {searchLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : searchData && searchData.topProvidersByInteraction.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead className="text-right">Interactions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchData.topProvidersByInteraction.map((p, i) => {
                      const max = searchData.topProvidersByInteraction[0]?.count || 1
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-muted-foreground">#{i + 1}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="w-40">
                            <div className="h-3 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-blue-500 rounded" style={{ width: `${(p.count / max) * 100}%` }} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">{p.count}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No interaction data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Search-to-Referral Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Search-to-Referral Funnel
              </CardTitle>
              <p className="text-sm text-muted-foreground">Conversion from search session → provider engagement → referral ticket</p>
            </CardHeader>
            <CardContent>
              {searchLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : searchData?.funnel ? (
                <div className="space-y-4">
                  {[
                    {
                      label: 'Searches Started',
                      count: searchData.funnel.totalSessions,
                      pct: 100,
                      color: 'bg-blue-500',
                      subtitle: 'All search sessions',
                    },
                    {
                      label: 'Clicked a Provider',
                      count: searchData.funnel.engagedSessions,
                      pct: searchData.funnel.engagementRate,
                      color: 'bg-teal-500',
                      subtitle: `${searchData.funnel.engagementRate}% engagement rate`,
                    },
                    {
                      label: 'Created a Referral',
                      count: searchData.funnel.convertedSessions,
                      pct: searchData.funnel.conversionRate,
                      color: 'bg-green-500',
                      subtitle: `${searchData.funnel.conversionRate}% conversion · ${searchData.funnel.engagedConversionRate}% of engaged`,
                    },
                  ].map((stage) => (
                    <div key={stage.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.label}</span>
                        <span className="font-bold tabular-nums">{stage.count.toLocaleString()}</span>
                      </div>
                      <div className="h-8 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${stage.color} transition-all`}
                          style={{ width: `${Math.max(stage.pct, stage.count > 0 ? 1 : 0)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{stage.subtitle}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No session data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geographic Distribution of Searches
              </CardTitle>
              <p className="text-sm text-muted-foreground">Top zip codes by search volume (all time)</p>
            </CardHeader>
            <CardContent>
              {searchLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : searchData && searchData.topZipCodes.length > 0 ? (
                <div className="space-y-2">
                  {searchData.topZipCodes.map((item) => {
                    const max = searchData.topZipCodes[0]?.count || 1
                    return (
                      <div key={item.zip_code} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-sm text-right text-muted-foreground font-mono">
                          {item.zip_code}
                        </span>
                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded"
                            style={{ width: `${(item.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-sm font-semibold text-right">{item.count}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No location data recorded yet. Zip codes are captured when users provide their location during search.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">

      {/* Summary stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : data && (
          <>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-4xl font-bold mt-1">{totalReferrals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Last 30 Days</p>
                <p className="text-4xl font-bold mt-1">{data.recentActivity.last30Days}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pending Referrals</p>
                <p className="text-4xl font-bold mt-1">
                  {data.referralsByStatus.find((s) => s.status === 'pending')?.count || 0}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Time to Resolution */}
      {!isLoading && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Average Time to Resolution
            </CardTitle>
            <p className="text-sm text-muted-foreground">How quickly referrals reach a closed status</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Summary */}
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    {data.timeToResolution.avgDays !== null
                      ? data.timeToResolution.avgDays < 1
                        ? `${Math.round(data.timeToResolution.avgDays * 24)}h`
                        : `${data.timeToResolution.avgDays}d`
                      : '—'}
                  </span>
                  <span className="text-muted-foreground">avg to close</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {data.timeToResolution.totalResolved.toLocaleString()} resolved referrals
                </p>
                {data.timeToResolution.avgDays !== null && (
                  <div className="text-sm space-y-1 pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fastest target</span>
                      <span className="font-medium text-green-600">{'< 1 day'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform average</span>
                      <span className="font-medium">
                        {data.timeToResolution.avgDays < 1
                          ? `${Math.round(data.timeToResolution.avgDays * 24)} hours`
                          : `${data.timeToResolution.avgDays} days`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* By status */}
              {data.timeToResolution.byStatus.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Avg days by resolution type</p>
                  {data.timeToResolution.byStatus.map((item) => {
                    const maxDays = Math.max(...data.timeToResolution.byStatus.map((s) => s.avg_days), 1)
                    return (
                      <div key={item.status} className="flex items-center gap-3">
                        <span className="w-36 shrink-0 text-xs text-right text-muted-foreground">
                          {statusLabels[item.status] || item.status}
                        </span>
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-orange-400 rounded"
                            style={{ width: `${(item.avg_days / maxDays) * 100}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-xs font-semibold text-right">
                          {item.avg_days < 1 ? `${Math.round(item.avg_days * 24)}h` : `${item.avg_days}d`}
                          <span className="font-normal text-muted-foreground ml-1">({item.count})</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No resolved referrals yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Referrals (Last 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : data && data.monthlyTrends.length > 0 ? (
            <MonthlyTrendChart data={data.monthlyTrends} />
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Two column layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Referrals by Category */}
        <Card>
          <CardHeader>
            <CardTitle>By Need Category</CardTitle>
            <p className="text-sm text-muted-foreground">Most requested services</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : data && data.referralsByCategory.length > 0 ? (
              <BarChart
                items={data.referralsByCategory.slice(0, 12).map((i) => ({
                  label: i.name,
                  count: i.count,
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Referrals by Status */}
        <Card>
          <CardHeader>
            <CardTitle>By Status</CardTitle>
            <p className="text-sm text-muted-foreground">Outcome breakdown</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : data && data.referralsByStatus.length > 0 ? (
              <BarChart
                items={data.referralsByStatus
                  .sort((a, b) => b.count - a.count)
                  .map((i) => ({
                    label: statusLabels[i.status] || i.status,
                    count: i.count,
                    color: statusColors[i.status],
                  }))}
                colorClass="bg-primary"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Providers by Referral Volume
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Providers receiving the most referrals
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data && data.topReferrers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topReferrers.map((provider, index) => {
                  const maxCount = data.topReferrers[0]?.count || 1
                  return (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell className="w-40">
                        <div className="h-3 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-primary rounded"
                            style={{ width: `${(provider.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{provider.count}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No referral data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Referrals by Source */}
      {!isLoading && data && data.referralsBySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Source</CardTitle>
            <p className="text-sm text-muted-foreground">Where referrals originate</p>
          </CardHeader>
          <CardContent>
            <BarChart
              items={data.referralsBySource
                .sort((a, b) => b.count - a.count)
                .map((i) => ({
                  label: i.source.replace(/_/g, ' '),
                  count: i.count,
                }))}
              colorClass="bg-violet-500"
            />
          </CardContent>
        </Card>
      )}
      </div>
      )}

      {/* Visual Charts Tab (Recharts) */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[350px]" />)}
            </div>
          ) : data ? (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <RechartsMonthlyChart data={data.monthlyTrends} />
                <StatusPieChart data={data.referralsByStatus} />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <CategoryBreakdownChart data={data.referralsByCategory} />
                <TopProvidersChart data={data.topReferrers} />
              </div>
              {data.referralsBySource.length > 0 && (
                <SourceBreakdownChart data={data.referralsBySource} />
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No data available</p>
          )}
        </div>
      )}

      {/* Reassignments Tab */}
      {activeTab === 'reassignments' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reassignments</CardTitle>
                <GitMerge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reassignmentData?.total_reassignments?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Provider Initiated</CardTitle>
                <ArrowRight className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reassignmentData?.provider_initiated?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reassignmentData && reassignmentData.total_reassignments > 0
                    ? `${Math.round((reassignmentData.provider_initiated / reassignmentData.total_reassignments) * 100)}%`
                    : '0%'}{' '}
                  of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Initiated</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reassignmentData?.admin_initiated?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reassignmentData && reassignmentData.total_reassignments > 0
                    ? `${Math.round((reassignmentData.admin_initiated / reassignmentData.total_reassignments) * 100)}%`
                    : '0%'}{' '}
                  of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg per Ticket</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reassignmentData?.average_reassignments_per_ticket?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">Reassigned tickets only</p>
              </CardContent>
            </Card>
          </div>

          {/* Top forwarding providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-orange-600" />
                Top Forwarding Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!reassignmentData ? (
                <Skeleton className="h-64 w-full" />
              ) : reassignmentData.top_forwarding_providers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead className="text-right">Forwards</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reassignmentData.top_forwarding_providers.slice(0, 10).map((p: any, i: number) => {
                      const max = reassignmentData.top_forwarding_providers[0]?.forward_count || 1
                      return (
                        <TableRow key={p.provider_id}>
                          <TableCell className="font-medium text-muted-foreground">#{i + 1}</TableCell>
                          <TableCell className="font-medium">{p.provider_name}</TableCell>
                          <TableCell className="w-40">
                            <div className="h-3 bg-muted rounded overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded"
                                style={{ width: `${(p.forward_count / max) * 100}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">{p.forward_count}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No forwarding data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Top receiving providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-green-600 rotate-180" />
                Top Receiving Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!reassignmentData ? (
                <Skeleton className="h-64 w-full" />
              ) : reassignmentData.top_receiving_providers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reassignmentData.top_receiving_providers.slice(0, 10).map((p: any, i: number) => {
                      const max = reassignmentData.top_receiving_providers[0]?.receive_count || 1
                      return (
                        <TableRow key={p.provider_id}>
                          <TableCell className="font-medium text-muted-foreground">#{i + 1}</TableCell>
                          <TableCell className="font-medium">{p.provider_name}</TableCell>
                          <TableCell className="w-40">
                            <div className="h-3 bg-muted rounded overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded"
                                style={{ width: `${(p.receive_count / max) * 100}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">{p.receive_count}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No receiving data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Reassignment reasons breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-blue-600" />
                Reassignment Reasons
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!reassignmentData ? (
                <Skeleton className="h-64 w-full" />
              ) : reassignmentData.reason_breakdown && Object.keys(reassignmentData.reason_breakdown).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(reassignmentData.reason_breakdown)
                    .filter(([_, count]) => (count as number) > 0)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([reason, count]) => {
                      const total = Object.values(reassignmentData.reason_breakdown).reduce((a: any, b: any) => a + b, 0) as number
                      const percentage = total > 0 ? ((count as number) / total) * 100 : 0
                      return (
                        <div key={reason} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{reason.replace(/_/g, ' ')}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                              <span className="font-bold">{count as number}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No reason data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
