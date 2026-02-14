'use client'

import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function FilesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-96" />

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            {/* File Browser Controls */}
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-10 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>

            {/* File Grid */}
            <LoadingSkeleton type="grid" count={6} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
