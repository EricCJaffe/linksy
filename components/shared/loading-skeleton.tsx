import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface LoadingSkeletonProps {
  type?: 'table' | 'card' | 'list' | 'grid' | 'form' | 'profile' | 'stats' | 'timeline'
  count?: number
  className?: string
}

export function LoadingSkeleton({
  type = 'card',
  count = 1,
  className,
}: LoadingSkeletonProps) {
  switch (type) {
    case 'table':
      return <TableSkeleton count={count} className={className} />
    case 'card':
      return <CardSkeleton count={count} className={className} />
    case 'list':
      return <ListSkeleton count={count} className={className} />
    case 'grid':
      return <GridSkeleton count={count} className={className} />
    case 'form':
      return <FormSkeleton className={className} />
    case 'profile':
      return <ProfileSkeleton className={className} />
    case 'stats':
      return <StatsSkeleton className={className} />
    case 'timeline':
      return <TimelineSkeleton count={count} className={className} />
    default:
      return <CardSkeleton count={count} className={className} />
  }
}

// Table Skeleton
function TableSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-lg border">
        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 border-b p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Table Rows */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  )
}

// Card Skeleton
function CardSkeleton({ count = 1, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// List Skeleton
function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      ))}
    </div>
  )
}

// Grid Skeleton
function GridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-32 w-full" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Form Skeleton
function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Form Fields */}
          {Array.from({ length: 4}).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Profile Skeleton
function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// Stats Skeleton
function StatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Timeline Skeleton
function TimelineSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-8', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative flex gap-4 pb-6">
          {/* Timeline line */}
          {i < count - 1 && (
            <div className="absolute left-5 top-12 -bottom-6 w-px bg-border" />
          )}

          {/* Avatar */}
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Spinner Component
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

// Full Page Loader
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <Spinner />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}

// Button Loading State
export function ButtonLoader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {children}
    </div>
  )
}
