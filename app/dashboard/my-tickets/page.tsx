'use client'

import { useState, useMemo } from 'react'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'
import { useTickets } from '@/lib/hooks/useTickets'
import { TicketDetailPanel } from '@/components/tickets/ticket-detail-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Search, CalendarDays, X } from 'lucide-react'
import type { Ticket, TicketStatus } from '@/lib/types/linksy'

const ticketStatusLabels: Record<TicketStatus, string> = {
  pending: 'Pending',
  in_process: 'In Process',
  customer_need_addressed: 'Service Provided',
  wrong_organization_referred: 'Wrong Org',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
  transferred_another_provider: 'Transferred',
  transferred_pending: 'Transferred Pending',
}

export default function MyTicketsPage() {
  const { data: access, isLoading: accessLoading } = useProviderAccess()
  const providerId = access?.provider?.id
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(
    { provider_id: providerId },
    { enabled: !!providerId }
  )
  const tickets = useMemo(() => ticketsData?.tickets || [], [ticketsData])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const q = search.toLowerCase()
      if (q) {
        const client = ticket.client_name?.toLowerCase() || ''
        const number = ticket.ticket_number?.toLowerCase() || ''
        const need = ticket.need?.name?.toLowerCase() || ''
        const desc = ticket.description_of_need?.toLowerCase() || ''
        if (!client.includes(q) && !number.includes(q) && !need.includes(q) && !desc.includes(q)) return false
      }
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false
      if (dateFrom && ticket.created_at < dateFrom) return false
      if (dateTo && ticket.created_at > dateTo + 'T23:59:59.999Z') return false
      return true
    })
  }, [tickets, search, statusFilter, dateFrom, dateTo])

  if (accessLoading || ticketsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!access?.hasAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Referrals</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have access to a provider organization.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedTicket(null)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Referrals
        </button>
        <TicketDetailPanel ticket={selectedTicket} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Referrals</h1>
        <p className="text-muted-foreground">
          Referrals and service requests for {access.provider.name}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search client, ticket #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-[220px]"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TicketStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
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
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px]"
          aria-label="From date"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px]"
          aria-label="To date"
        />
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Clear dates
          </Button>
        )}
      </div>

      {filteredTickets.length > 0 ? (
        <div className="space-y-3">
          {filteredTickets.map((ticket: Ticket) => (
            <Card
              key={ticket.id}
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">#{ticket.ticket_number}</span>
                    <Badge variant={ticket.status === 'pending' ? 'default' : 'secondary'}>
                      {ticketStatusLabels[ticket.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {ticket.client_name || 'Anonymous'} &bull; {ticket.need?.name || 'No need specified'}
                  </div>
                  {ticket.description_of_need && (
                    <p className="mt-2 text-sm line-clamp-2">{ticket.description_of_need}</p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            {tickets.length === 0
              ? 'No referrals found for your organization.'
              : 'No referrals match the current filters.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
