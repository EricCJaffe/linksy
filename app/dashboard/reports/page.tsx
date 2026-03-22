'use client'

import { useState, useEffect, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, TrendingUp, Users, BarChart3, History, Search, Phone, Globe, AlertTriangle, Navigation, MapPin, Clock, GitMerge, PieChart as PieChartIcon, ArrowRight, FileText, ChevronDown, ChevronUp, Calendar, Download, Map } from 'lucide-react'
import {
  MonthlyTrendsChart as RechartsMonthlyChart,
  CategoryBreakdownChart,
  StatusPieChart,
  TopProvidersChart,
  SourceBreakdownChart,
} from '@/components/analytics/report-charts'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'

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

interface TopProviderWithServices {
  id: string
  name: string
  referralType: string
  count: number
  topServices: { name: string; count: number }[]
}

interface NonReferralSummary {
  total: number
  byStatus: { status: string; count: number }[]
  byCategory: { name: string; count: number }[]
  topProviders: TopProviderWithServices[]
}

interface UniqueClientsData {
  totalReferrals: number
  uniqueClients: number
  uniqueClientsIncludingTest: number
  blankNameCount: number
  testNameCount: number
  utilizationRatio: number
}

interface ReportsData {
  referralsByCategory: { name: string; count: number }[]
  topReferrers: TopProviderWithServices[]
  referralsByStatus: { status: string; count: number }[]
  referralsBySource: { source: string; count: number }[]
  monthlyTrends: { month: string; count: number }[]
  recentActivity: { last30Days: number }
  timeToResolution: TimeToResolution
  nonReferralSummary: NonReferralSummary
  uniqueClients: UniqueClientsData
  totalIncludingNR: number
}

interface RepeatClientReferral {
  id: string
  status: string
  created_at: string
  providerName: string
  needName: string
}

interface RepeatClient {
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  totalReferrals: number
  repeatedNeeds: {
    needName: string
    referrals: RepeatClientReferral[]
  }[]
}

interface RepeatClientsData {
  repeatClients: RepeatClient[]
  totalRepeatClients: number
  top10ByMonth: {
    month: string
    clients: { name: string; email: string | null; phone: string | null; count: number }[]
  }[]
}

interface StatusByProviderData {
  providers: {
    providerId: string
    providerName: string
    total: number
    statusCounts: Record<string, number>
  }[]
  allStatuses: string[]
  totalTickets: number
}

interface ServiceGapCategory {
  categoryId: string
  categoryName: string
  providerCount: number
  providers: string[]
  hasGap: boolean
}

interface ServiceGapZipEntry {
  zipCode: string
  categories: ServiceGapCategory[]
  gapCount: number
  totalCategories: number
}

interface ServiceGapCategoryEntry {
  categoryId: string
  categoryName: string
  zipCodes: {
    zipCode: string
    providerCount: number
    providers: string[]
    hasGap: boolean
  }[]
  gapCount: number
  totalZipCodes: number
}

interface ServiceGapsData {
  zipCodes: string[]
  categories: { id: string; name: string }[]
  byZipCode: ServiceGapZipEntry[]
  byCategory: ServiceGapCategoryEntry[]
  summary: {
    totalZipCodes: number
    totalCategories: number
    totalGaps: number
    totalCells: number
  }
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_process: 'In Process',
  customer_need_addressed: 'Service Provided',
  wrong_organization_referred: 'Wrong Organization',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Client Unresponsive',
  transferred_another_provider: 'Transferred',
  transferred_pending: 'Transferred Pending',
}

const statusColors: Record<string, string> = {
  pending: 'bg-blue-500',
  in_process: 'bg-yellow-500',
  customer_need_addressed: 'bg-green-500',
  wrong_organization_referred: 'bg-orange-500',
  outside_of_scope: 'bg-gray-400',
  client_not_eligible: 'bg-gray-400',
  unable_to_assist: 'bg-red-400',
  client_unresponsive: 'bg-gray-400',
  transferred_another_provider: 'bg-gray-500',
  transferred_pending: 'bg-blue-400',
}

function BarChart({ items, colorClass = 'bg-primary' }: {
  items: { label: string; count: number }[]
  colorClass?: string
}) {
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
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
      {data.map((d) => {
        const heightPct = (d.count / max) * 100
        const label = new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
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

function downloadServiceGapsCsv(data: ServiceGapsData, view: 'by-zip' | 'by-category') {
  let csv = ''

  if (view === 'by-zip') {
    // Header: Zip Code, Gaps, Category1, Category2, ...
    csv += ['Zip Code', 'Gaps', ...data.categories.map((c) => `"${c.name}"`)].join(',') + '\n'
    for (const row of data.byZipCode) {
      const cells = [
        row.zipCode,
        row.gapCount.toString(),
        ...row.categories.map((c) =>
          c.hasGap ? '0 (GAP)' : `${c.providerCount}`
        ),
      ]
      csv += cells.join(',') + '\n'
    }
  } else {
    // Header: Category, Gaps, Zip1, Zip2, ...
    csv += ['Category', 'Gaps', ...data.zipCodes].join(',') + '\n'
    for (const row of data.byCategory) {
      const cells = [
        `"${row.categoryName}"`,
        row.gapCount.toString(),
        ...row.zipCodes.map((z) =>
          z.hasGap ? '0 (GAP)' : `${z.providerCount}`
        ),
      ]
      csv += cells.join(',') + '\n'
    }
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `service-gaps-${view}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'referrals' | 'search' | 'charts' | 'reassignments' | 'admin-reports' | 'service-gaps'>('referrals')
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [data, setData] = useState<ReportsData | null>(null)
  const [searchData, setSearchData] = useState<SearchAnalyticsData | null>(null)
  const [reassignmentData, setReassignmentData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeLegacy, setIncludeLegacy] = useState(true)
  const [includeTest, setIncludeTest] = useState(false)

  // Service gaps state
  const [serviceGapsData, setServiceGapsData] = useState<ServiceGapsData | null>(null)
  const [serviceGapsLoading, setServiceGapsLoading] = useState(false)
  const [serviceGapsView, setServiceGapsView] = useState<'by-zip' | 'by-category'>('by-zip')

  // Admin reports state
  const [repeatClientsData, setRepeatClientsData] = useState<RepeatClientsData | null>(null)
  const [statusByProviderData, setStatusByProviderData] = useState<StatusByProviderData | null>(null)
  const [adminReportsLoading, setAdminReportsLoading] = useState(false)
  const [adminDateFrom, setAdminDateFrom] = useState('')
  const [adminDateTo, setAdminDateTo] = useState('')
  const [expandedRepeatClient, setExpandedRepeatClient] = useState<number | null>(null)
  const [adminIncludeTest, setAdminIncludeTest] = useState(false)

  // Get user role and provider access for role-based filtering
  const { data: user } = useCurrentUser()
  const { data: providerAccess } = useProviderAccess()

  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const isProviderUser = providerAccess?.hasAccess && !isSiteAdmin
  const accessLevel = providerAccess?.accessLevel || 'self'

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set('type', 'referrals')
        if (includeLegacy) params.set('includeLegacy', 'true')
        if (includeTest) params.set('include_test', 'true')
        const res = await fetch(`/api/reports?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch reports')
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    fetchReports()
  }, [includeLegacy, includeTest])

  useEffect(() => {
    const fetchSearchAnalytics = async () => {
      setSearchLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('type', 'search')
        const res = await fetch(`/api/reports?${params.toString()}`)
        if (res.ok) setSearchData(await res.json())
      } catch {
        // non-fatal
      } finally {
        setSearchLoading(false)
      }
    }
    fetchSearchAnalytics()
  }, [])

  useEffect(() => {
    const fetchReassignmentStats = async () => {
      if (!isSiteAdmin) return
      try {
        const params = new URLSearchParams()
        params.set('type', 'reassignments')
        const res = await fetch(`/api/reports?${params.toString()}`)
        if (res.ok) setReassignmentData(await res.json())
      } catch {
        // non-fatal
      }
    }
    if (activeTab === 'reassignments' && isSiteAdmin) fetchReassignmentStats()
  }, [activeTab, isSiteAdmin])

  useEffect(() => {
    const fetchAdminReports = async () => {
      if (!isSiteAdmin || activeTab !== 'admin-reports') return
      setAdminReportsLoading(true)
      try {
        const baseParams = new URLSearchParams()
        if (adminDateFrom) baseParams.set('date_from', adminDateFrom)
        if (adminDateTo) baseParams.set('date_to', adminDateTo)
        if (adminIncludeTest) baseParams.set('include_test', 'true')

        const repeatParams = new URLSearchParams(baseParams)
        repeatParams.set('type', 'repeat-clients')
        const statusParams = new URLSearchParams(baseParams)
        statusParams.set('type', 'status-by-provider')

        const [repeatRes, statusRes] = await Promise.all([
          fetch(`/api/reports?${repeatParams.toString()}`),
          fetch(`/api/reports?${statusParams.toString()}`),
        ])

        if (repeatRes.ok) setRepeatClientsData(await repeatRes.json())
        if (statusRes.ok) setStatusByProviderData(await statusRes.json())
      } catch {
        // non-fatal
      } finally {
        setAdminReportsLoading(false)
      }
    }
    fetchAdminReports()
  }, [activeTab, isSiteAdmin, adminDateFrom, adminDateTo, adminIncludeTest])

  useEffect(() => {
    const fetchServiceGaps = async () => {
      if (!isSiteAdmin || activeTab !== 'service-gaps') return
      if (serviceGapsData) return // already loaded
      setServiceGapsLoading(true)
      try {
        const res = await fetch('/api/reports?type=service-gaps')
        if (res.ok) setServiceGapsData(await res.json())
      } catch {
        // non-fatal
      } finally {
        setServiceGapsLoading(false)
      }
    }
    fetchServiceGaps()
  }, [activeTab, isSiteAdmin, serviceGapsData])

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
            {isSiteAdmin && 'System-wide analytics and reporting'}
            {isProviderUser && accessLevel === 'parent_admin' && 'Your organization\'s analytics and reporting'}
            {isProviderUser && accessLevel === 'self' && 'Your personal analytics and activity'}
            {!isSiteAdmin && !isProviderUser && 'Insights and trends across the platform'}
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
            {isSiteAdmin && (
              <Button
                variant={includeTest ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIncludeTest(!includeTest)}
                className={includeTest ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                Include Test Referrals
              </Button>
            )}
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
        {isSiteAdmin && (
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
        )}
        {isSiteAdmin && (
          <button
            onClick={() => setActiveTab('admin-reports')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'admin-reports'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-1.5" />
            Admin Reports
          </button>
        )}
        {isSiteAdmin && (
          <button
            onClick={() => setActiveTab('service-gaps')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'service-gaps'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="h-4 w-4 inline mr-1.5" />
            Service Gaps
          </button>
        )}
      </div>

      {/* Search & AI Analytics Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Summary stat cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {searchLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={`skel-${i}`} className="h-24" />)
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
              <p className="text-sm text-muted-foreground">Conversion from search session → provider engagement → referral</p>
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
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={`skel-${i}`} className="h-24" />)
        ) : data && (
          <>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Referrals (Services)</p>
                <p className="text-4xl font-bold mt-1">{totalReferrals}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Non-Referrals (NR)</p>
                <p className="text-4xl font-bold mt-1 text-amber-600">{data.nonReferralSummary?.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Contact-directly orgs</p>
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
            <Card className="border-teal-200">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Unique Clients</p>
                <p className="text-4xl font-bold mt-1 text-teal-600">{data.uniqueClients?.uniqueClients || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.uniqueClients?.utilizationRatio || 0}x avg utilization
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
                  <Skeleton key={`skel-${i}`} className="h-6 w-full" />
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
                  <Skeleton key={`skel-${i}`} className="h-6 w-full" />
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

      {/* Top Referrers with drill-down */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Providers by Referral Volume
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a provider to see their top 3 services
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
                  const isExpanded = expandedProvider === provider.id
                  return (
                    <Fragment key={provider.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                      >
                        <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {provider.name}
                          {provider.topServices && provider.topServices.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </TableCell>
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
                      {isExpanded && provider.topServices && provider.topServices.length > 0 && (
                        <TableRow>
                          <TableCell />
                          <TableCell colSpan={3} className="py-2">
                            <div className="bg-muted/30 rounded-md p-3 space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Top Services</p>
                              {provider.topServices.map((svc) => (
                                <div key={svc.name} className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                                    <div
                                      className="h-full bg-blue-400 rounded"
                                      style={{ width: `${(svc.count / provider.topServices[0].count) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground min-w-[120px] truncate">{svc.name}</span>
                                  <span className="text-xs font-semibold w-8 text-right">{svc.count}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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

      {/* Non-Referral (NR) Organizations */}
      {!isLoading && data && data.nonReferralSummary && data.nonReferralSummary.total > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Users className="h-5 w-5" />
              Non-Referral (NR) Organizations
              <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">Contact Directly</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Organizations where clients contact directly (not through referral system). Counted separately from Services Provided.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-2">Top NR Providers</p>
                {data.nonReferralSummary.topProviders.length > 0 ? (
                  <div className="space-y-2">
                    {data.nonReferralSummary.topProviders.map((p) => {
                      const max = data.nonReferralSummary.topProviders[0]?.count || 1
                      return (
                        <div key={p.id} className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="w-32 shrink-0 truncate text-sm text-right text-muted-foreground" title={p.name}>{p.name}</span>
                            <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                              <div className="h-full rounded bg-amber-400" style={{ width: `${(p.count / max) * 100}%` }} />
                            </div>
                            <span className="w-8 shrink-0 text-sm font-semibold text-right">{p.count}</span>
                          </div>
                          {p.topServices.length > 0 && (
                            <div className="ml-36 text-xs text-muted-foreground">
                              {p.topServices.map((s) => s.name).join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No NR provider data</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">NR Status Breakdown</p>
                <BarChart
                  items={data.nonReferralSummary.byStatus.map((i: any) => ({
                    label: statusLabels[i.status] || i.status,
                    count: i.count,
                  }))}
                  colorClass="bg-amber-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unique Client Count (True Utilization) */}
      {!isLoading && data && data.uniqueClients && (
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <Users className="h-5 w-5" />
              Unique Client Count (True Utilization)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How many distinct people used the system vs total referral count. Same person multiple times = counted once. Test names excluded.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-3xl font-bold mt-1">{data.uniqueClients.totalReferrals}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Unique Clients</p>
                <p className="text-3xl font-bold mt-1 text-teal-600">{data.uniqueClients.uniqueClients}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg Referrals/Client</p>
                <p className="text-3xl font-bold mt-1">{data.uniqueClients.utilizationRatio}x</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Excluded</p>
                <p className="text-3xl font-bold mt-1 text-gray-400">{data.uniqueClients.testNameCount + data.uniqueClients.blankNameCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.uniqueClients.testNameCount} test + {data.uniqueClients.blankNameCount} blank
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Is it {data.uniqueClients.uniqueClients} people using the system, or {data.uniqueClients.totalReferrals} total referrals?
              Answer: {data.uniqueClients.uniqueClients} unique clients generated {data.uniqueClients.totalReferrals} referrals.
            </p>
          </CardContent>
        </Card>
      )}

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
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={`skel-${i}`} className="h-[350px]" />)}
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
                <CardTitle className="text-sm font-medium">Avg per Referral</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reassignmentData?.average_reassignments_per_ticket?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">Reassigned referrals only</p>
              </CardContent>
            </Card>
          </div>

          {/* Top transferring providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-orange-600" />
                Top Transferring Providers
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
                      <TableHead className="text-right">Transfers</TableHead>
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
                <p className="text-sm text-muted-foreground text-center py-8">No transfer data yet</p>
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

      {/* Admin Reports Tab */}
      {activeTab === 'admin-reports' && isSiteAdmin && (
        <div className="space-y-6">
          {/* Date range filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label htmlFor="admin-date-from" className="text-sm">From</Label>
                  <Input
                    id="admin-date-from"
                    type="date"
                    value={adminDateFrom}
                    onChange={(e) => setAdminDateFrom(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-date-to" className="text-sm">To</Label>
                  <Input
                    id="admin-date-to"
                    type="date"
                    value={adminDateTo}
                    onChange={(e) => setAdminDateTo(e.target.value)}
                    className="w-44"
                  />
                </div>
                <Button
                  variant={adminIncludeTest ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAdminIncludeTest(!adminIncludeTest)}
                  className={adminIncludeTest ? 'bg-orange-600 hover:bg-orange-700' : ''}
                >
                  Include Test Referrals
                </Button>
                {(adminDateFrom || adminDateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAdminDateFrom(''); setAdminDateTo('') }}
                  >
                    Clear Dates
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Repeat Clients Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Repeat Clients Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Clients with more than one referral for the same need category
                {adminDateFrom || adminDateTo ? (
                  <span className="ml-1 font-medium">
                    ({adminDateFrom || 'all time'} to {adminDateTo || 'present'})
                  </span>
                ) : null}
              </p>
            </CardHeader>
            <CardContent>
              {adminReportsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={`repeat-skel-${i}`} className="h-10 w-full" />
                  ))}
                </div>
              ) : repeatClientsData && repeatClientsData.repeatClients.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {repeatClientsData.totalRepeatClients} repeat client{repeatClientsData.totalRepeatClients !== 1 ? 's' : ''} found
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Repeat Referrals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repeatClientsData.repeatClients.map((client, idx) => {
                        const isExpanded = expandedRepeatClient === idx
                        return (
                          <Fragment key={idx}>
                            <TableRow
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedRepeatClient(isExpanded ? null : idx)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {client.clientName || 'Unknown'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {client.clientEmail && <span className="block">{client.clientEmail}</span>}
                                {client.clientPhone && <span className="block">{client.clientPhone}</span>}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {client.totalReferrals}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell />
                                <TableCell colSpan={3} className="py-2">
                                  <div className="space-y-3">
                                    {client.repeatedNeeds.map((need) => (
                                      <div key={need.needName} className="bg-muted/30 rounded-md p-3">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                          {need.needName} ({need.referrals.length} referrals)
                                        </p>
                                        <div className="space-y-1">
                                          {need.referrals.map((ref) => (
                                            <div key={ref.id} className="flex items-center gap-3 text-sm">
                                              <span className="w-24 shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(ref.created_at).toLocaleDateString()}
                                              </span>
                                              <span className="flex-1 truncate">{ref.providerName}</span>
                                              <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                  ref.status === 'pending' ? 'border-blue-300 text-blue-700' :
                                                  ref.status === 'in_process' ? 'border-yellow-300 text-yellow-700' :
                                                  ref.status === 'customer_need_addressed' ? 'border-green-300 text-green-700' :
                                                  ref.status === 'unable_to_assist' ? 'border-red-300 text-red-700' :
                                                  'border-gray-300 text-gray-700'
                                                }`}
                                              >
                                                {statusLabels[ref.status] || ref.status}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No repeat clients found for the selected date range
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Repeat Clients by Month */}
          {!adminReportsLoading && repeatClientsData && repeatClientsData.top10ByMonth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top 10 Repeat Clients by Month
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Highest-volume repeat clients broken down by month
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {repeatClientsData.top10ByMonth.map((monthData) => (
                    <div key={monthData.month}>
                      <p className="text-sm font-medium mb-2">
                        {new Date(monthData.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <div className="space-y-1">
                        {monthData.clients.map((client, i) => {
                          const max = monthData.clients[0]?.count || 1
                          return (
                            <div key={`${monthData.month}-${i}`} className="flex items-center gap-3">
                              <span className="w-6 shrink-0 text-xs text-muted-foreground text-right">
                                #{i + 1}
                              </span>
                              <span className="w-40 shrink-0 truncate text-sm text-muted-foreground" title={client.name}>
                                {client.name}
                              </span>
                              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded"
                                  style={{ width: `${(client.count / max) * 100}%` }}
                                />
                              </div>
                              <span className="w-8 shrink-0 text-sm font-semibold text-right">{client.count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Breakdown by Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Status Breakdown by Provider
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Pending totals, Unable to Assist totals, and other status counts per provider
              </p>
            </CardHeader>
            <CardContent>
              {adminReportsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={`status-skel-${i}`} className="h-10 w-full" />
                  ))}
                </div>
              ) : statusByProviderData && statusByProviderData.providers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Provider</TableHead>
                        <TableHead className="text-right font-bold">Total</TableHead>
                        {statusByProviderData.allStatuses.map((status) => (
                          <TableHead key={status} className="text-right text-xs whitespace-nowrap">
                            {statusLabels[status] || status}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusByProviderData.providers.map((provider) => (
                        <TableRow key={provider.providerId}>
                          <TableCell className="sticky left-0 bg-background font-medium whitespace-nowrap">
                            {provider.providerName}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {provider.total}
                          </TableCell>
                          {statusByProviderData.allStatuses.map((status) => {
                            const count = provider.statusCounts[status] || 0
                            const isPending = status === 'pending'
                            const isUnableToAssist = status === 'unable_to_assist'
                            return (
                              <TableCell
                                key={status}
                                className={`text-right text-sm ${
                                  count > 0
                                    ? isPending
                                      ? 'text-blue-700 font-semibold'
                                      : isUnableToAssist
                                        ? 'text-red-600 font-semibold'
                                        : ''
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {count || '-'}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="border-t-2 font-bold">
                        <TableCell className="sticky left-0 bg-background">Totals</TableCell>
                        <TableCell className="text-right">
                          {statusByProviderData.totalTickets}
                        </TableCell>
                        {statusByProviderData.allStatuses.map((status) => {
                          const total = statusByProviderData.providers.reduce(
                            (sum, p) => sum + (p.statusCounts[status] || 0), 0
                          )
                          return (
                            <TableCell key={status} className="text-right">
                              {total || '-'}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No provider data found for the selected date range
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Gaps Tab */}
      {activeTab === 'service-gaps' && isSiteAdmin && (
        <div className="space-y-6">
          {/* Summary cards */}
          {serviceGapsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={`gap-skel-${i}`} className="h-24" />)}
            </div>
          ) : serviceGapsData ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Clay County Zip Codes</p>
                    <p className="text-4xl font-bold mt-1">{serviceGapsData.summary.totalZipCodes}</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-white">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Service Categories</p>
                    <p className="text-4xl font-bold mt-1">{serviceGapsData.summary.totalCategories}</p>
                  </CardContent>
                </Card>
                <Card className={serviceGapsData.summary.totalGaps > 0 ? 'border-orange-300 bg-gradient-to-b from-orange-50 to-white' : 'border-green-300 bg-gradient-to-b from-green-50 to-white'}>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Service Gaps Found</p>
                    <p className={`text-4xl font-bold mt-1 ${serviceGapsData.summary.totalGaps > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {serviceGapsData.summary.totalGaps}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      of {serviceGapsData.summary.totalCells} zip/category combinations
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* View toggle and CSV export */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={serviceGapsView === 'by-zip' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setServiceGapsView('by-zip')}
                  >
                    <MapPin className="h-4 w-4 mr-1.5" />
                    By Zip Code
                  </Button>
                  <Button
                    variant={serviceGapsView === 'by-category' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setServiceGapsView('by-category')}
                  >
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    By Category
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadServiceGapsCsv(serviceGapsData, serviceGapsView)}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Export CSV
                </Button>
              </div>

              {/* By Zip Code View */}
              {serviceGapsView === 'by-zip' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Service Coverage by Zip Code
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      For each Clay County zip code, shows which service categories have providers and where gaps exist
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">Zip Code</TableHead>
                            <TableHead className="text-center min-w-[80px]">Gaps</TableHead>
                            {serviceGapsData.categories.map((cat) => (
                              <TableHead key={cat.id} className="text-center min-w-[120px] text-xs">
                                {cat.name}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceGapsData.byZipCode.map((zipEntry) => (
                            <TableRow key={zipEntry.zipCode}>
                              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                                {zipEntry.zipCode}
                              </TableCell>
                              <TableCell className="text-center">
                                {zipEntry.gapCount > 0 ? (
                                  <Badge variant="destructive" className="text-xs">
                                    {zipEntry.gapCount}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800 text-xs">0</Badge>
                                )}
                              </TableCell>
                              {zipEntry.categories.map((cat) => (
                                <TableCell
                                  key={cat.categoryId}
                                  className={`text-center text-sm ${cat.hasGap ? 'bg-red-50' : ''}`}
                                  title={cat.providers.length > 0 ? cat.providers.join(', ') : 'No providers'}
                                >
                                  {cat.hasGap ? (
                                    <span className="text-red-500 font-semibold">--</span>
                                  ) : (
                                    <span className="text-green-700 font-medium">{cat.providerCount}</span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Numbers show provider count per zip/category. <span className="text-red-500 font-semibold">--</span> indicates a gap (no providers). Hover over a cell to see provider names.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* By Category View */}
              {serviceGapsView === 'by-category' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Service Coverage by Category
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      For each service category, shows which zip codes have providers and where gaps exist
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Category</TableHead>
                            <TableHead className="text-center min-w-[80px]">Gaps</TableHead>
                            {serviceGapsData.zipCodes.map((zip) => (
                              <TableHead key={zip} className="text-center min-w-[90px]">
                                {zip}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceGapsData.byCategory.map((catEntry) => (
                            <TableRow key={catEntry.categoryId}>
                              <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">
                                {catEntry.categoryName}
                              </TableCell>
                              <TableCell className="text-center">
                                {catEntry.gapCount > 0 ? (
                                  <Badge variant="destructive" className="text-xs">
                                    {catEntry.gapCount}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800 text-xs">0</Badge>
                                )}
                              </TableCell>
                              {catEntry.zipCodes.map((zipEntry) => (
                                <TableCell
                                  key={zipEntry.zipCode}
                                  className={`text-center text-sm ${zipEntry.hasGap ? 'bg-red-50' : ''}`}
                                  title={zipEntry.providers.length > 0 ? zipEntry.providers.join(', ') : 'No providers'}
                                >
                                  {zipEntry.hasGap ? (
                                    <span className="text-red-500 font-semibold">--</span>
                                  ) : (
                                    <span className="text-green-700 font-medium">{zipEntry.providerCount}</span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Numbers show provider count per category/zip. <span className="text-red-500 font-semibold">--</span> indicates a gap (no providers). Hover over a cell to see provider names.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Unable to load service gap data
            </p>
          )}
        </div>
      )}
    </div>
  )
}
