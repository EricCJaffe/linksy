'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProviders } from '@/lib/hooks/useProviders'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { ProviderFiltersBar } from '@/components/providers/provider-filters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Download, CheckSquare, AlertTriangle } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { usePendingApplicationCount } from '@/lib/hooks/useProviderApplications'
import Link from 'next/link'
import type { ProviderFilters } from '@/lib/types/linksy'

const LIMIT = 50

const sectorLabels: Record<string, string> = {
  nonprofit: 'Nonprofit',
  faith_based: 'Faith Based',
  government: 'Government',
  business: 'Business',
}

const sectorBadgeClass: Record<string, string> = {
  nonprofit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  faith_based: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  government: 'bg-sky-50 text-sky-700 border-sky-200',
  business: 'bg-amber-50 text-amber-700 border-amber-200',
}

const statusBadgeClass: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-300',
}

const referralTypeBadgeClass: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700 border-blue-200',
  contact_directly: 'bg-violet-50 text-violet-700 border-violet-200',
}

export default function ProvidersPage() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const [filters, setFilters] = useState<ProviderFilters>({
    status: 'active',
    limit: LIMIT,
    offset: 0,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const debouncedQ = useDebounce(filters.q, 300)
  const queryFilters = { ...filters, q: debouncedQ }
  const { data, isLoading, error, refetch } = useProviders(queryFilters)
  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const { data: pendingCount } = usePendingApplicationCount()

  const handleFilterChange = (updates: Partial<ProviderFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
    setSelectedIds(new Set())
  }

  const currentPage = Math.floor((filters.offset || 0) / LIMIT) + 1
  const totalPages = data ? Math.ceil(data.pagination.total / LIMIT) : 0
  const providers = data?.providers || []

  const allOnPageSelected = providers.length > 0 && providers.every((p) => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(providers.map((p) => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkActivate = async (is_active: boolean) => {
    if (selectedIds.size === 0) return
    const label = is_active ? 'activate' : 'deactivate'
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${selectedIds.size} provider(s)?`)) return

    setIsBulkUpdating(true)
    try {
      const res = await fetch('/api/admin/providers/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), is_active }),
      })
      if (!res.ok) throw new Error('Bulk update failed')
      setSelectedIds(new Set())
      refetch()
    } catch (err) {
      alert('Failed to update providers: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const handleExportSelected = () => {
    if (selectedIds.size === 0) {
      // No selection → export all with current filters
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      window.open(`/api/admin/export/providers?${params.toString()}`, '_blank')
    } else {
      // Export selected as CSV, built client-side from current page data
      const selected = providers.filter((p) => selectedIds.has(p.id))
      const headers = ['Name', 'Sector', 'Phone', 'Status', 'Referral Type']
      const rows = selected.map((p) => [
        p.name,
        sectorLabels[p.sector] || p.sector,
        p.phone || '',
        p.provider_status === 'active' ? 'Active' : p.provider_status === 'paused' ? 'Paused' : 'Inactive',
        p.referral_type === 'contact_directly' ? 'Contact Directly' : 'Standard',
      ])
      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `providers-selected-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Providers</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.pagination.total} provider{data.pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isSiteAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportSelected}>
              <Download className="h-4 w-4 mr-2" />
              {selectedIds.size > 0 ? `Export ${selectedIds.size} Selected` : 'Export CSV'}
            </Button>
            <Button onClick={() => router.push('/dashboard/admin/providers/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </div>
        )}
      </div>

      {isSiteAdmin && pendingCount != null && pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">
            <strong>{pendingCount}</strong> provider application{pendingCount !== 1 ? 's' : ''} awaiting review
          </span>
          <Link
            href="/dashboard/admin/provider-applications"
            className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            Review now
          </Link>
        </div>
      )}

      <ProviderFiltersBar filters={filters} onChange={handleFilterChange} />

      {/* Bulk action bar */}
      {someSelected && isSiteAdmin && (
        <div className="flex items-center gap-3 rounded-md border border-primary/25 bg-primary/5 px-4 py-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
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
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkUpdating}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive p-4 text-destructive">
          Failed to load providers. Please try again.
        </div>
      )}

      <div className="rounded-md border border-primary/20">
        <Table>
          <TableHeader>
            <TableRow>
              {isSiteAdmin && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all on page"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Referral Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {isSiteAdmin && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSiteAdmin ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  No providers found.
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => (
                <TableRow
                  key={provider.id}
                  className={`cursor-pointer ${selectedIds.has(provider.id) ? 'bg-muted/50' : ''}`}
                  onClick={() => router.push(`/dashboard/providers/${provider.id}`)}
                >
                  {isSiteAdmin && (
                    <TableCell onClick={(e) => { e.stopPropagation(); toggleSelect(provider.id) }}>
                      <Checkbox
                        checked={selectedIds.has(provider.id)}
                        onCheckedChange={() => toggleSelect(provider.id)}
                        aria-label={`Select ${provider.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={sectorBadgeClass[provider.sector] || 'bg-muted text-muted-foreground'}>
                      {sectorLabels[provider.sector] || provider.sector}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {provider.phone || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {provider.location_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={statusBadgeClass[provider.provider_status] || 'bg-muted text-muted-foreground'}
                      >
                        {provider.provider_status === 'active' ? 'Active' :
                         provider.provider_status === 'paused' ? 'Paused' : 'Inactive'}
                      </Badge>
                      {!provider.accepting_referrals && (
                        <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 text-xs">
                          Not Accepting
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={referralTypeBadgeClass[provider.referral_type] || 'bg-muted text-muted-foreground'}
                    >
                      {provider.referral_type === 'contact_directly'
                        ? 'Contact Directly'
                        : 'Standard'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!filters.offset}
              onClick={() =>
                handleFilterChange({ offset: Math.max(0, (filters.offset || 0) - LIMIT) })
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasMore}
              onClick={() =>
                handleFilterChange({ offset: (filters.offset || 0) + LIMIT })
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
