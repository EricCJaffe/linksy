'use client'

import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Globe, Clock } from 'lucide-react'
import { useProvider } from '@/lib/hooks/useProviders'
import { ProviderDetailTabs } from '@/components/providers/provider-detail-tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const sectorLabels: Record<string, string> = {
  nonprofit: 'Nonprofit',
  faith_based: 'Faith Based',
  government: 'Government',
  business: 'Business',
}

const sectorBadgeClass: Record<string, string> = {
  nonprofit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  faith_based: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  government: 'bg-sky-50 text-sky-700 border-sky-200',
  business: 'bg-amber-50 text-amber-700 border-amber-200',
}

const statusBadgeClass: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-300',
}

const referralTypeBadgeClass: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700 border-blue-200',
  contact_directly: 'bg-violet-50 text-violet-700 border-violet-200',
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

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{provider.name}</h1>
          <Badge variant="outline" className={sectorBadgeClass[provider.sector] || 'bg-muted text-muted-foreground'}>
            {sectorLabels[provider.sector] || provider.sector}
          </Badge>
          <Badge
            variant="outline"
            className={statusBadgeClass[provider.provider_status] || 'bg-muted text-muted-foreground'}
          >
            {provider.provider_status === 'active' ? 'Active' :
              provider.provider_status === 'paused' ? 'Paused' : 'Inactive'}
          </Badge>
          <Badge
            variant="outline"
            className={referralTypeBadgeClass[provider.referral_type] || 'bg-muted text-muted-foreground'}
          >
            {provider.referral_type === 'contact_directly' ? 'Contact Directly' : 'Standard'}
          </Badge>
        </div>
        <Button size="sm" asChild>
          <Link href="/dashboard/support">Linksy Support</Link>
        </Button>
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
