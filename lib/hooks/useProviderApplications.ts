'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProviderApplication, ApplicationStatus } from '@/lib/types/linksy'

interface ApplicationsResponse {
  applications: ProviderApplication[]
  pagination: { total: number }
}

export function useProviderApplications(
  status: ApplicationStatus | 'all' = 'pending',
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ['provider-applications', status, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('status', status)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      const res = await fetch(`/api/admin/provider-applications?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch applications')
      return res.json() as Promise<ApplicationsResponse>
    },
    staleTime: 1 * 60 * 1000,
  })
}

export function usePendingApplicationCount() {
  return useQuery({
    queryKey: ['provider-applications', 'pending-count'],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'pending', limit: '1', offset: '0' })
      const res = await fetch(`/api/admin/provider-applications?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch pending count')
      const data = (await res.json()) as ApplicationsResponse
      return data.pagination.total
    },
    staleTime: 1 * 60 * 1000,
  })
}

export function useReviewApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      action,
      notes,
    }: {
      id: string
      action: 'approve' | 'reject'
      notes?: string
    }) => {
      const res = await fetch(`/api/admin/provider-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to review application')
      }
      return res.json() as Promise<{ success: true; status: string; providerId?: string }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-applications'] })
    },
  })
}
