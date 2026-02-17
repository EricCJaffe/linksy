'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CrisisKeyword } from '@/lib/types/linksy'

export function useCrisisKeywords(site_id?: string) {
  return useQuery<CrisisKeyword[]>({
    queryKey: ['crisis-keywords', site_id],
    queryFn: async () => {
      const params = site_id ? `?site_id=${site_id}` : ''
      const res = await fetch(`/api/crisis-keywords${params}`)
      if (!res.ok) throw new Error('Failed to fetch crisis keywords')
      return res.json()
    },
  })
}

export function useCreateCrisisKeyword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<CrisisKeyword, 'id' | 'created_at'>) => {
      const res = await fetch('/api/crisis-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create keyword')
      }
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crisis-keywords'] }),
  })
}

export function useUpdateCrisisKeyword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CrisisKeyword> & { id: string }) => {
      const res = await fetch(`/api/crisis-keywords/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update keyword')
      }
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crisis-keywords'] }),
  })
}

export function useDeactivateCrisisKeyword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crisis-keywords/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to deactivate keyword')
      }
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crisis-keywords'] }),
  })
}

export function useTestCrisis() {
  return useMutation({
    mutationFn: async ({ message, site_id }: { message: string; site_id: string }) => {
      const res = await fetch('/api/crisis-keywords/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, site_id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Test failed')
      }
      return res.json() as Promise<{ detected: boolean; result: any }>
    },
  })
}
