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
    staleTime: 15 * 1000, // 15s — short so landing on a fresh ticket picks up triage quickly
    refetchInterval: (query) => {
      const data = query.state.data as SupportTicket | undefined
      // Poll every 3s while triage is running or remediation is in-flight
      if (
        data?.ai_triage_status === 'analyzing' ||
        data?.remediation_status === 'approved' ||
        data?.remediation_status === 'generating'
      ) {
        return 3000
      }
      // Poll once more after creation so auto-triage result lands
      if (data?.ai_triage_status === 'pending') {
        return 5000
      }
      return false
    },
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

export function useTriggerSupportTicketTriage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch(`/api/support-tickets/${ticketId}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Triage failed' }))
        throw new Error(data.error || 'Failed to run AI triage')
      }
      return res.json()
    },
    onSuccess: (_data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] })
    },
  })
}

export function useApproveRemediation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch(`/api/support-tickets/${ticketId}/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Remediation failed' }))
        throw new Error(data.error || 'Failed to start remediation')
      }
      return res.json() as Promise<{
        status: string
        pr_url: string
        branch: string
        summary: string
        files_changed: { path: string; summary: string }[]
      }>
    },
    onSuccess: (_data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['supportTicket', ticketId] })
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
