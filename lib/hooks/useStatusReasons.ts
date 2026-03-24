'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TicketStatusReason } from '@/lib/types/linksy'

export function useStatusReasons(parentStatus?: string) {
  const params = parentStatus ? `?parent_status=${parentStatus}` : ''
  return useQuery<TicketStatusReason[]>({
    queryKey: ['status-reasons', parentStatus || 'all'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/status-reasons${params}`)
      if (!res.ok) throw new Error('Failed to fetch status reasons')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateStatusReason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { parent_status: string; label: string }) => {
      const res = await fetch('/api/admin/status-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create status reason')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-reasons'] })
    },
  })
}

export function useUpdateStatusReason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; label?: string; sort_order?: number; is_active?: boolean }) => {
      const res = await fetch(`/api/admin/status-reasons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update status reason')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-reasons'] })
    },
  })
}

export function useDeleteStatusReason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/status-reasons/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete status reason')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-reasons'] })
    },
  })
}
