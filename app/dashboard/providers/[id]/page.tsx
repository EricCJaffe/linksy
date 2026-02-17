'use client'

import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Globe, Clock } from 'lucide-react'
import { useProvider } from '@/lib/hooks/useProviders'
import { ProviderDetailTabs } from '@/components/providers/provider-detail-tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const sectorLabels: Record<string, string> = {
  nonprofit: 'Nonprofit',
  faith_based: 'Faith Based',
  government: 'Government',
  business: 'Business',
}

export default function ProviderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const { data: provider, isLoading, error } = useProvider(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/providers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Providers
        </Link>
        <div className="rounded-md border border-destructive p-4 text-destructive">
          Provider not found.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/providers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Providers
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">{provider.name}</h1>
        <Badge variant="secondary">
          {sectorLabels[provider.sector] || provider.sector}
        </Badge>
        <Badge variant={provider.is_active ? 'default' : 'outline'}>
          {provider.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
        {provider.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-4 w-4" />
            {provider.phone}
          </span>
        )}
        {provider.email && (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${provider.email}`} className="hover:text-foreground">
              {provider.email}
            </a>
          </span>
        )}
        {provider.website && (
          <span className="inline-flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {provider.website}
            </a>
          </span>
        )}
        {provider.hours && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {provider.hours}
          </span>
        )}
      </div>

      <ProviderDetailTabs provider={provider} />
    </div>
  )
}
