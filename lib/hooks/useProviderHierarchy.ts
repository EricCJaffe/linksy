import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Provider, ProviderHierarchy, ParentOrgStats } from '@/lib/types/linksy'

interface ChildrenResponse {
  parent_id: string
  children: Provider[]
  total_children: number
}

interface ParentStatsFilters {
  dateFrom?: string
  dateTo?: string
}

/**
 * Fetch full hierarchy (parent + children) for a provider
 */
export function useProviderHierarchy(providerId: string | null) {
  return useQuery({
    queryKey: ['provider-hierarchy', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required')

      const res = await fetch(`/api/providers/${providerId}/hierarchy`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch hierarchy')
      }
      return res.json() as Promise<ProviderHierarchy>
    },
    enabled: !!providerId,
  })
}

/**
 * Fetch all child providers for a parent
 */
export function useProviderChildren(providerId: string | null) {
  return useQuery({
    queryKey: ['provider-children', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required')

      const res = await fetch(`/api/providers/${providerId}/children`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch children')
      }
      return res.json() as Promise<ChildrenResponse>
    },
    enabled: !!providerId,
  })
}

/**
 * Set or remove parent relationship for a provider
 */
export function useSetParentProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      providerId,
      parentProviderId,
    }: {
      providerId: string
      parentProviderId: string | null
    }) => {
      const res = await fetch(`/api/admin/providers/${providerId}/set-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_provider_id: parentProviderId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to set parent')
      }

      return res.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['provider-hierarchy', variables.providerId],
      })
      queryClient.invalidateQueries({
        queryKey: ['provider-detail', variables.providerId],
      })
      queryClient.invalidateQueries({ queryKey: ['providers'] })

      // If we set a parent, also invalidate that parent's children
      if (variables.parentProviderId) {
        queryClient.invalidateQueries({
          queryKey: ['provider-children', variables.parentProviderId],
        })
        queryClient.invalidateQueries({
          queryKey: ['provider-hierarchy', variables.parentProviderId],
        })
      }
    },
  })
}

/**
 * Fetch aggregated statistics for a parent organization
 */
export function useParentOrgStats(
  providerId: string | null,
  filters?: ParentStatsFilters
) {
  return useQuery({
    queryKey: ['parent-org-stats', providerId, filters],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required')

      const params = new URLSearchParams()
      if (filters?.dateFrom) params.set('date_from', filters.dateFrom)
      if (filters?.dateTo) params.set('date_to', filters.dateTo)

      const res = await fetch(
        `/api/providers/${providerId}/parent-stats?${params.toString()}`
      )
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch parent stats')
      }
      return res.json() as Promise<ParentOrgStats>
    },
    enabled: !!providerId,
  })
}
