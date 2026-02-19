'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CallLog } from '@/lib/types/linksy'

export function useCallLogs(ticketId?: string, providerId?: string) {
  return useQuery({
    queryKey: ['callLogs', ticketId, providerId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (ticketId) params.set('ticket_id', ticketId)
      if (providerId) params.set('provider_id', providerId)
      const res = await fetch(`/api/call-logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch call logs')
      return res.json() as Promise<{
        callLogs: CallLog[]
        pagination: { total: number; hasMore: boolean; nextOffset: number | null }
      }>
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateCallLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      ticket_id?: string
      provider_id?: string
      caller_name?: string
      call_type: 'inbound' | 'outbound'
      duration_minutes?: number
      notes?: string
    }) => {
      const res = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create call log')
      return res.json() as Promise<CallLog>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callLogs'] })
    },
  })
}

export function useDeleteCallLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/call-logs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete call log')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callLogs'] })
    },
  })
}
