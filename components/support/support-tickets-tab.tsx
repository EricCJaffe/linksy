'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupportTickets } from '@/lib/hooks/useSupportTickets'
import { AlertCircle, Plus } from 'lucide-react'
import type { SupportTicketStatus, SupportTicketPriority } from '@/lib/types/linksy'

const statusColors: Record<SupportTicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityColors: Record<SupportTicketPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export function SupportTicketsTab() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const { data, isLoading, error } = useSupportTickets({ status: statusFilter, limit: 50 })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load support tickets.</AlertDescription>
      </Alert>
    )
  }

  const tickets = data?.tickets || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('open')}
          >
            Open
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
        </div>

        <Button onClick={() => router.push('/dashboard/support')}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Alert>
          <AlertDescription>
            {statusFilter === 'open'
              ? 'No open support tickets.'
              : statusFilter === 'in_progress'
              ? 'No tickets in progress.'
              : 'No support tickets found.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => router.push(`/dashboard/support/${ticket.id}`)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-medium">
                        {ticket.ticket_number}
                      </span>
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={priorityColors[ticket.priority]}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground ml-4">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
