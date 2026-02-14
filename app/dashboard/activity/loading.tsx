'use client'

import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="mb-2 h-9 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full max-w-md" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="space-y-6">
        <Skeleton className="h-10 w-96" />

        {/* Timeline Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <LoadingSkeleton type="timeline" count={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
