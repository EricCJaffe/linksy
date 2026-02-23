'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTickets, useUpdateTicket } from '@/lib/hooks/useTickets'
import { useProviders } from '@/lib/hooks/useProviders'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Globe, Search, Download, CheckSquare } from 'lucide-react'
import type { TicketFilters, TicketStatus } from '@/lib/types/linksy'

const LIMIT = 50

const ticketStatusLabels: Record<TicketStatus, string> = {
  pending: 'Pending',
  customer_need_addressed: 'Need Addressed',
  wrong_organization_referred: 'Wrong Org Referred',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
}

const ticketStatusClass: Record<TicketStatus, string> = {
  pending: 'border-blue-200 bg-blue-50 text-blue-700',
  customer_need_addressed: 'border-green-200 bg-green-50 text-green-700',
  wrong_organization_referred: 'border-orange-200 bg-orange-50 text-orange-700',
  outside_of_scope: 'border-slate-200 bg-slate-100 text-slate-700',
  client_not_eligible: 'border-amber-200 bg-amber-50 text-amber-800',
  unable_to_assist: 'border-red-200 bg-red-50 text-red-700',
  client_unresponsive: 'border-violet-200 bg-violet-50 text-violet-700',
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={ticketStatusClass[status]}>
      {ticketStatusLabels[status] || status}
    </Badge>
  )
}

export default function TicketsPage() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const updateTicket = useUpdateTicket()
  const [filters, setFilters] = useState<TicketFilters>({
    status: 'all',
    limit: LIMIT,
    offset: 0,
  })
  const [publicReferralStats, setPublicReferralStats] = useState({ total: 0, pending: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const debouncedQ = useDebounce(filters.q, 300)
  const queryFilters = { ...filters, q: debouncedQ }
  const { data, isLoading, error } = useTickets(queryFilters)
  const { data: providersData } = useProviders({ limit: 200 })
  const isSiteAdmin = user?.profile?.role === 'site_admin'

  // Calculate public referral stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/tickets?limit=1000')
        if (response.ok) {
          const allTickets = await response.json()
          const publicTickets = allTickets.tickets.filter((t: any) => t.source === 'public_search')
          const pendingPublic = publicTickets.filter((t: any) => t.status === 'pending')
          setPublicReferralStats({
            total: publicTickets.length,
            pending: pendingPublic.length,
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }
    fetchStats()
  }, [data])

  const handleFilterChange = (updates: Partial<TicketFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates, offset: 0 }))
    setSelectedIds(new Set())
  }

  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }))
  }

  const currentPage = Math.floor((filters.offset || 0) / LIMIT) + 1
  const totalPages = data ? Math.ceil(data.pagination.total / LIMIT) : 0
  const tickets = data?.tickets || []

  const allOnPageSelected = tickets.length > 0 && tickets.every((t) => selectedIds.has(t.id))
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkStatusChange = async (newStatus: TicketStatus) => {
    if (selectedIds.size === 0) return
    setIsBulkUpdating(true)
    try {
      const res = await fetch('/api/tickets/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: newStatus }),
      })
      if (!res.ok) throw new Error('Bulk update failed')
      setSelectedIds(new Set())
      // Force refetch
      handleFilterChange({})
    } catch (err) {
      alert('Failed to update tickets: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsBulkUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Referral Management</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.pagination.total} referral{data.pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isSiteAdmin && (
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams()
              if (filters.status && filters.status !== 'all') params.set('status', filters.status)
              window.open(`/api/admin/export/referrals?${params.toString()}`, '_blank')
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {publicReferralStats.total > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Public Referrals</p>
                  <p className="text-2xl font-bold">{publicReferralStats.total}</p>
                </div>
                <Globe className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Public Referrals</p>
                  <p className="text-2xl font-bold">{publicReferralStats.pending}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-sm font-bold text-yellow-700">{publicReferralStats.pending}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search client name..."
          value={filters.q || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, offset: 0 }))}
          className="w-64"
        />
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => handleFilterChange({ status: v as TicketStatus | 'all' })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(ticketStatusLabels) as TicketStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ticketStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.provider_id || 'all'}
          onValueChange={(v) => handleFilterChange({ provider_id: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providersData?.providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {someSelected && isSiteAdmin && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select
            value=""
            onValueChange={(v) => handleBulkStatusChange(v as TicketStatus)}
          >
            <SelectTrigger className="w-[200px] ml-auto" disabled={isBulkUpdating}>
              <SelectValue placeholder="Change status to..." />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ticketStatusLabels) as TicketStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {ticketStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            disabled={isBulkUpdating}
          >
            Clear
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive p-4 text-destructive">
          Failed to load tickets. Please try again.
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
              <TableHead>Referral #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Need</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {isSiteAdmin && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-[180px]" /></TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSiteAdmin ? 8 : 7} className="h-24 text-center text-muted-foreground">
                  No referrals found.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} className={selectedIds.has(ticket.id) ? 'bg-muted/50' : ''}>
                  {isSiteAdmin && (
                    <TableCell onClick={(e) => { e.stopPropagation(); toggleSelect(ticket.id) }}>
                      <Checkbox
                        checked={selectedIds.has(ticket.id)}
                        onCheckedChange={() => toggleSelect(ticket.id)}
                        aria-label={`Select ticket ${ticket.ticket_number}`}
                      />
                    </TableCell>
                  )}
                  <TableCell
                    className="font-medium cursor-pointer"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      {ticket.source === 'public_search' && (
                        <Globe className="h-4 w-4 text-primary" />
                      )}
                      {ticket.ticket_number}
                    </div>
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    {ticket.client_name || '-'}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground cursor-pointer"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    {ticket.provider?.name || '-'}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground cursor-pointer"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    {ticket.need?.name || '-'}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground cursor-pointer"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      {new Date(ticket.created_at).toLocaleDateString()}
                      {ticket.status === 'pending' && ticket.sla_due_at && (() => {
                        const hoursLeft = (new Date(ticket.sla_due_at).getTime() - Date.now()) / (1000 * 60 * 60)
                        if (hoursLeft < 0) return <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="SLA overdue" />
                        if (hoursLeft < 12) return <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" title="SLA approaching" />
                        return <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="SLA on track" />
                      })()}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={ticket.status}
                      onValueChange={(value) =>
                        updateTicket.mutate({ id: ticket.id, status: value as TicketStatus })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ticketStatusLabels) as TicketStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {ticketStatusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                handlePageChange(Math.max(0, (filters.offset || 0) - LIMIT))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasMore}
              onClick={() =>
                handlePageChange((filters.offset || 0) + LIMIT)
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
