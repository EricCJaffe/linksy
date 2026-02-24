'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ticket, TicketComment, TicketFilters, TicketEvent } from '@/lib/types/linksy'

function buildTicketParams(filters: TicketFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.provider_id) params.set('provider_id', filters.provider_id)
  if (filters.need_id) params.set('need_id', filters.need_id)
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  return params.toString()
}

export function useTickets(filters: TicketFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const qs = buildTicketParams(filters)
      const res = await fetch(`/api/tickets?${qs}`)
      if (!res.ok) throw new Error('Failed to fetch tickets')
      return res.json() as Promise<{
        tickets: Ticket[]
        pagination: { total: number; hasMore: boolean; nextOffset: number | null }
      }>
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  })
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${id}`)
      if (!res.ok) throw new Error('Failed to fetch ticket')
      return res.json() as Promise<Ticket>
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Ticket>) => {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update ticket')
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useCreateTicketComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      is_private,
    }: {
      ticketId: string
      content: string
      is_private: boolean
    }) => {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, is_private }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      return res.json() as Promise<TicketComment>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
    },
  })
}

export function useForwardTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      action,
      target_provider_id,
      reason,
      notes,
      new_status,
    }: {
      ticketId: string
      action: 'forward_to_admin' | 'forward_to_provider'
      target_provider_id?: string
      reason: 'unable_to_assist' | 'wrong_org' | 'capacity' | 'other'
      notes?: string
      new_status?: string
    }) => {
      const res = await fetch(`/api/tickets/${ticketId}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target_provider_id, reason, notes, new_status }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to forward ticket')
      }
      return res.json() as Promise<{ success: boolean; ticket: Ticket }>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useReassignTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      target_provider_id,
      target_contact_id,
      reason,
      notes,
      preserve_history,
    }: {
      ticketId: string
      target_provider_id: string
      target_contact_id?: string
      reason?: string
      notes?: string
      preserve_history?: boolean
    }) => {
      const res = await fetch(`/api/admin/tickets/${ticketId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_provider_id,
          target_contact_id,
          reason,
          notes,
          preserve_history,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reassign ticket')
      }
      return res.json() as Promise<{ success: boolean; ticket: Ticket }>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useAssignTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      assigned_to_user_id,
      notes,
    }: {
      ticketId: string
      assigned_to_user_id: string
      notes?: string
    }) => {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_user_id, notes }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to assign ticket')
      }
      return res.json() as Promise<{ success: boolean; ticket: Ticket }>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
