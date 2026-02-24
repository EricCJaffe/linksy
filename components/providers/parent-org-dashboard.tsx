'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { useParentOrgStats } from '@/lib/hooks/useProviderHierarchy'
import { useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  FileText,
  MousePointerClick,
  Calendar,
  StickyNote,
  MapPin,
  TrendingUp,
  Phone,
  Globe,
  Navigation,
  Eye,
  RefreshCw,
  CheckSquare,
} from 'lucide-react'
import Link from 'next/link'

interface ParentOrgDashboardProps {
  providerId: string
}

export function ParentOrgDashboard({ providerId }: ParentOrgDashboardProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<{
    dateFrom?: string
    dateTo?: string
  }>({})
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const { data, isLoading, refetch } = useParentOrgStats(providerId, appliedFilters)
  const queryClient = useQueryClient()

  const handleApplyFilters = () => {
    setAppliedFilters({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
  }

  const handleClearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setAppliedFilters({})
  }

  const toggleSelectAll = () => {
    if (!data) return
    const allChildIds = data.children_stats.map((c) => c.provider_id)
    if (selectedChildIds.size === allChildIds.length) {
      setSelectedChildIds(new Set())
    } else {
      setSelectedChildIds(new Set(allChildIds))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedChildIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkStatusUpdate = async (newStatus: 'active' | 'paused' | 'inactive') => {
    if (selectedChildIds.size === 0) return

    setIsBulkUpdating(true)
    try {
      await Promise.all(
        Array.from(selectedChildIds).map((childId) =>
          fetch(`/api/providers/${childId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider_status: newStatus }),
          })
        )
      )

      // Refresh data
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setSelectedChildIds(new Set())
    } catch (error) {
      console.error('Failed to update providers:', error)
      alert('Failed to update some providers')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedChildIds.size === 0) return

    setIsBulkUpdating(true)
    try {
      await Promise.all(
        Array.from(selectedChildIds).map((childId) =>
          fetch(`/api/providers/${childId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              is_active: activate,
              provider_status: activate ? 'active' : 'inactive'
            }),
          })
        )
      )

      // Refresh data
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setSelectedChildIds(new Set())
    } catch (error) {
      console.error('Failed to update providers:', error)
      alert('Failed to update some providers')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Unable to load parent organization statistics
          </p>
        </CardContent>
      </Card>
    )
  }

  const metrics = data.aggregated_metrics
  const analytics = metrics.combined_analytics

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Range Filter</CardTitle>
          <CardDescription>
            Filter statistics by date range. Leave empty for all-time stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_from">From</Label>
              <Input
                id="date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_to">To</Label>
              <Input
                id="date_to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={handleApplyFilters}>Apply</Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing data from{' '}
              {appliedFilters.dateFrom
                ? new Date(appliedFilters.dateFrom).toLocaleDateString()
                : 'beginning'}{' '}
              to{' '}
              {appliedFilters.dateTo
                ? new Date(appliedFilters.dateTo).toLocaleDateString()
                : 'now'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.total_children + 1}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.total_children} {data.total_children === 1 ? 'child' : 'children'} + 1
              parent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_referrals}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.open_referrals} open, {metrics.closed_referrals} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Interactions
            </CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_interactions}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.profile_views} profile views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_events}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.upcoming_events} upcoming
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement Breakdown</CardTitle>
          <CardDescription>
            Detailed interaction metrics across all locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{analytics.profile_views}</div>
                <p className="text-xs text-muted-foreground">Profile Views</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{analytics.phone_clicks}</div>
                <p className="text-xs text-muted-foreground">Phone Clicks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{analytics.website_clicks}</div>
                <p className="text-xs text-muted-foreground">Website Clicks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Navigation className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">
                  {analytics.directions_clicks}
                </div>
                <p className="text-xs text-muted-foreground">Directions Clicks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes & Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.total_notes}</div>
            <p className="text-sm text-muted-foreground">Total notes across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Physical Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.total_locations}</div>
            <p className="text-sm text-muted-foreground">
              Total addresses across all providers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedChildIds.size > 0 && (
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
          <CheckSquare className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{selectedChildIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkActivate(true)}
              disabled={isBulkUpdating}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkActivate(false)}
              disabled={isBulkUpdating}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusUpdate('paused')}
              disabled={isBulkUpdating}
            >
              Pause
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedChildIds(new Set())}
              disabled={isBulkUpdating}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Per-Child Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Location Performance Breakdown
          </CardTitle>
          <CardDescription>
            Individual statistics for parent organization and each child location. Select child locations to perform bulk operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        data.children_stats.length > 0 &&
                        selectedChildIds.size === data.children_stats.length
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all children"
                    />
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Interactions</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Notes</TableHead>
                  <TableHead className="text-right">Addresses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Parent Row */}
                <TableRow className="bg-muted/30">
                  <TableCell>
                    {/* No checkbox for parent */}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/providers/${data.parent_id}`}
                      className="hover:underline flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      {data.parent_stats.provider_name}
                      <Badge variant="outline" className="text-xs">
                        Parent
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        data.parent_stats.is_active ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {data.parent_stats.provider_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {data.parent_stats.referral_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.parent_stats.interaction_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.parent_stats.event_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.parent_stats.note_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.parent_stats.location_count}
                  </TableCell>
                </TableRow>

                {/* Children Rows */}
                {data.children_stats.map((child) => (
                  <TableRow key={child.provider_id}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedChildIds.has(child.provider_id)}
                        onCheckedChange={() => toggleSelect(child.provider_id)}
                        aria-label={`Select ${child.provider_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/providers/${child.provider_id}`}
                        className="hover:underline flex items-center gap-2"
                      >
                        {child.provider_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={child.is_active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {child.provider_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {child.referral_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {child.interaction_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {child.event_count}
                    </TableCell>
                    <TableCell className="text-right">{child.note_count}</TableCell>
                    <TableCell className="text-right">
                      {child.location_count}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell></TableCell>
                  <TableCell>Total (All Locations)</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right">
                    {metrics.total_referrals}
                  </TableCell>
                  <TableCell className="text-right">
                    {metrics.total_interactions}
                  </TableCell>
                  <TableCell className="text-right">
                    {metrics.total_events}
                  </TableCell>
                  <TableCell className="text-right">{metrics.total_notes}</TableCell>
                  <TableCell className="text-right">
                    {metrics.total_locations}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
