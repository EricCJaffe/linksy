'use client'

import { useEffect, useRef } from 'react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { Loader2, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityItem } from './activity-item'
import { useActivityFeed, type ActivityScope } from '@/lib/hooks/useActivityFeed'
import type { Activity } from '@/lib/utils/activity'

interface ActivityTimelineProps {
  scope?: ActivityScope
  actionType?: string
  showDetails?: boolean
}

function groupActivitiesByDay(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {}

  activities.forEach((activity) => {
    const date = new Date(activity.created_at)
    let label: string

    if (isToday(date)) {
      label = 'Today'
    } else if (isYesterday(date)) {
      label = 'Yesterday'
    } else {
      label = format(date, 'MMMM d, yyyy')
    }

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(activity)
  })

  return groups
}

export function ActivityTimeline({
  scope = 'company',
  actionType,
  showDetails = true,
}: ActivityTimelineProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useActivityFeed(scope, actionType)

  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Flatten all activities from all pages
  const allActivities = data?.pages.flatMap((page) => page.activities) || []

  // Group activities by day
  const groupedActivities = groupActivitiesByDay(allActivities)
  const dayLabels = Object.keys(groupedActivities)

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-red-500">Failed to load activities</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }

  // Empty state
  if (allActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No activity yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {scope === 'personal'
            ? "Your recent activities will appear here"
            : "Team activities will appear here as people work"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {dayLabels.map((dayLabel) => (
        <div key={dayLabel}>
          <div className="sticky top-0 z-10 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {dayLabel}
            </h3>
          </div>

          <div className="space-y-0">
            {groupedActivities[dayLabel].map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                showDetails={showDetails}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Manual load more button (fallback) */}
      {!isFetchingNextPage && hasNextPage && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={() => fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
