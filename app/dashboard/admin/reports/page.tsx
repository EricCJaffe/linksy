'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, TrendingUp, Users, BarChart3, History, Search, Phone, Globe, AlertTriangle, Navigation } from 'lucide-react'

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
}

interface ReportsData {
  referralsByCategory: { name: string; count: number }[]
  topReferrers: { id: string; name: string; count: number }[]
  referralsByStatus: { status: string; count: number }[]
  referralsBySource: { source: string; count: number }[]
  monthlyTrends: { month: string; count: number }[]
  recentActivity: { last30Days: number }
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
  const [activeTab, setActiveTab] = useState<'referrals' | 'search'>('referrals')
  const [data, setData] = useState<ReportsData | null>(null)
  const [searchData, setSearchData] = useState<SearchAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeLegacy, setIncludeLegacy] = useState(true)

  useEffect(() => { fetchReports() }, [includeLegacy])
  useEffect(() => { fetchSearchAnalytics() }, [])

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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
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
      <div className="flex gap-1 border-b">
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
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Searches</p>
                    <p className="text-4xl font-bold mt-1">{searchData.totalSessions.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                    <p className="text-4xl font-bold mt-1">{searchData.sessionsLast30Days.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Provider Interactions</p>
                    <p className="text-4xl font-bold mt-1">{searchData.totalInteractions.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className={searchData.totalCrisisDetections > 0 ? 'border-red-300' : ''}>
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
                            <div className="h-full bg-blue-500 rounded" style={{ width: `${(item.count / max) * 100}%` }} />
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
    </div>
  )
}
