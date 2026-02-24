'use client'

import { useQuery } from '@tanstack/react-query'
import type { TicketEvent } from '@/lib/types/linksy'

export function useTicketEvents(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-events', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/events`)
      if (!res.ok) throw new Error('Failed to fetch ticket events')
      return res.json() as Promise<{ events: TicketEvent[] }>
    },
    enabled: !!ticketId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}
