import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { Activity } from '@/lib/utils/activity'

export type ActivityScope = 'personal' | 'company'

export interface ActivityFilters {
  scope?: ActivityScope
  action_type?: string
  limit?: number
}

export interface ActivityResponse {
  activities: Activity[]
  pagination: {
    hasMore: boolean
    nextOffset: number
    total: number
  }
}

async function fetchActivities(
  scope: ActivityScope = 'company',
  actionType?: string,
  limit: number = 20,
  offset: number = 0
): Promise<ActivityResponse> {
  const params = new URLSearchParams()
  params.set('scope', scope)
  params.set('limit', limit.toString())
  params.set('offset', offset.toString())
  if (actionType) {
    params.set('action_type', actionType)
  }

  const response = await fetch(`/api/activity?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch activities')
  }

  return response.json()
}

/**
 * Hook to fetch activity feed with infinite scroll support
 */
export function useActivityFeed(
  scope: ActivityScope = 'company',
  actionType?: string,
  limit: number = 20
) {
  return useInfiniteQuery({
    queryKey: ['activities', scope, actionType],
    queryFn: ({ pageParam = 0 }) => fetchActivities(scope, actionType, limit, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.nextOffset
      }
      return undefined
    },
    initialPageParam: 0,
  })
}

/**
 * Hook to fetch a single page of activities
 */
export function useActivities(filters: ActivityFilters = {}) {
  const { scope = 'company', action_type, limit = 20 } = filters

  return useQuery({
    queryKey: ['activities', scope, action_type, limit],
    queryFn: () => fetchActivities(scope, action_type, limit, 0),
  })
}
