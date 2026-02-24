'use client'

import { useProviderHierarchy } from '@/lib/hooks/useProviderHierarchy'
import { ChevronRight, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

interface ProviderBreadcrumbsProps {
  providerId: string
  providerName?: string
}

export function ProviderBreadcrumbs({ providerId, providerName }: ProviderBreadcrumbsProps) {
  const { data: hierarchy, isLoading } = useProviderHierarchy(providerId)

  if (isLoading) {
    return <Skeleton className="h-6 w-64" />
  }

  if (!hierarchy) {
    return null
  }

  const { provider, parent } = hierarchy

  // If no parent, don't show breadcrumbs (standalone or parent org)
  if (!parent) {
    return null
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Building2 className="h-4 w-4" />
      <Link
        href={`/dashboard/providers/${parent.id}`}
        className="hover:text-foreground transition-colors"
      >
        {parent.name}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium">
        {providerName || provider.name}
      </span>
    </nav>
  )
}
