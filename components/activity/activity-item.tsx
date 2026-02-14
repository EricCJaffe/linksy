'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  formatActivityDescription,
  getActivityIcon,
  getActivityColor,
  type Activity,
} from '@/lib/utils/activity'

interface ActivityItemProps {
  activity: Activity
  showDetails?: boolean
}

export function ActivityItem({ activity, showDetails = true }: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const userName = activity.user?.profile?.full_name || activity.user?.email || 'Unknown'
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  const description = formatActivityDescription(activity)
  const iconName = getActivityIcon(activity)
  const colorClass = getActivityColor(activity)

  // Dynamically get the icon component
  const IconComponent = (Icons as any)[iconName] || Icons.Activity

  const hasDetails = activity.details && Object.keys(activity.details).length > 0

  return (
    <div className="group relative flex gap-4 pb-6">
      {/* Timeline line */}
      <div className="absolute left-5 top-12 -bottom-6 w-px bg-border group-last:hidden" />

      {/* Avatar with icon badge */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={activity.user?.profile?.avatar_url || undefined} />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background',
            colorClass
          )}
        >
          <IconComponent className="h-3 w-3" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">{description}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Details section */}
        {showDetails && hasDetails && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronRight className="mr-1 h-3 w-3" />
                  Show details
                </>
              )}
            </Button>

            {isExpanded && (
              <div className="mt-2 rounded-lg bg-muted p-3 text-xs">
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(activity.details, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
