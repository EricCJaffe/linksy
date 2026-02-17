'use client'

import { useState } from 'react'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'
import { useTickets } from '@/lib/hooks/useTickets'
import { TicketDetailPanel } from '@/components/tickets/ticket-detail-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import type { Ticket, TicketStatus } from '@/lib/types/linksy'

const ticketStatusLabels: Record<TicketStatus, string> = {
  pending: 'Pending',
  customer_need_addressed: 'Need Addressed',
  wrong_organization_referred: 'Wrong Org',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
}

export default function MyTicketsPage() {
  const { data: access, isLoading: accessLoading } = useProviderAccess()
  const providerId = access?.provider?.id
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(
    { provider_id: providerId },
    { enabled: !!providerId }
  )
  const tickets = ticketsData?.tickets || []
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

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
            You don't have access to a provider organization.
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
          ← Back to Referrals
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

      {tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket: Ticket) => (
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
                    {ticket.client_name || 'Anonymous'} • {ticket.need?.name || 'No need specified'}
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
          <AlertDescription>No referrals found for your organization.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
