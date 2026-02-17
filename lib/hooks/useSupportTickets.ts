'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupportTicket, SupportTicketComment } from '@/lib/types/linksy'

export function useSupportTickets(filters?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['supportTickets', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters?.limit) params.set('limit', String(filters.limit))

      const res = await fetch(`/api/support-tickets?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch support tickets')
      return res.json() as Promise<{
        tickets: SupportTicket[]
        pagination: { total: number; hasMore: boolean; nextOffset: number | null }
      }>
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useSupportTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['supportTicket', id],
    queryFn: async () => {
      const res = await fetch(`/api/support-tickets/${id}`)
      if (!res.ok) throw new Error('Failed to fetch support ticket')
      return res.json() as Promise<SupportTicket>
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpdateSupportTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<SupportTicket>) => {
      const res = await fetch(`/api/support-tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update support ticket')
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supportTicket', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] })
    },
  })
}

export function useCreateSupportTicketComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      is_internal,
    }: {
      ticketId: string
      content: string
      is_internal: boolean
    }) => {
      const res = await fetch(`/api/support-tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, is_internal }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      return res.json() as Promise<SupportTicketComment>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supportTicket', variables.ticketId] })
    },
  })
}
