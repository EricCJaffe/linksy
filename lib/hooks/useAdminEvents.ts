'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProviderEvent } from '@/lib/types/linksy'

export function useAdminEvents(status: 'pending' | 'approved' | 'rejected' | 'all' = 'all') {
  return useQuery({
    queryKey: ['admin-events', status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/events?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json() as Promise<ProviderEvent[]>
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useApproveEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/admin/events/${eventId}/approve`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to approve event')
      return res.json() as Promise<ProviderEvent>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
  })
}

export function useRejectEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/admin/events/${eventId}/reject`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to reject event')
      return res.json() as Promise<ProviderEvent>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
  })
}
