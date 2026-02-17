'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useTicket } from '@/lib/hooks/useTickets'
import { TicketDetailPanel } from '@/components/tickets/ticket-detail-panel'
import { Skeleton } from '@/components/ui/skeleton'

export default function TicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const { data: ticket, isLoading, error } = useTicket(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Referrals
        </Link>
        <div className="rounded-md border border-destructive p-4 text-destructive">
          Referral not found.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Referrals
      </Link>

      <TicketDetailPanel ticket={ticket} />
    </div>
  )
}
