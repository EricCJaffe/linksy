'use client'

import { useState } from 'react'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'
import { useProvider, useProviders, useProviderAnalytics } from '@/lib/hooks/useProviders'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { ProviderDetailTabs } from '@/components/providers/provider-detail-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, FileText, CheckCircle, Users, Phone, Globe, MapPin, Eye } from 'lucide-react'

export default function MyOrganizationPage() {
  const { data: user } = useCurrentUser()
  const { data: access, isLoading: accessLoading } = useProviderAccess()
  const { data: allProviders } = useProviders({ limit: 1000 }, { enabled: user?.profile?.role === 'site_admin' })
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)

  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const providerId = isSiteAdmin && selectedProviderId ? selectedProviderId : access?.provider?.id
  const { data: provider, isLoading: providerLoading } = useProvider(providerId, undefined, {
    enabled: !!providerId,
  })
  const { data: analytics } = useProviderAnalytics(providerId)

  if (accessLoading || providerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Site admins get a provider selector
  if (isSiteAdmin && !selectedProviderId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Provider Portal Preview</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select a provider to preview their portal view:
          </AlertDescription>
        </Alert>
        <div className="max-w-md">
          <Select value={selectedProviderId || ''} onValueChange={setSelectedProviderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a provider..." />
            </SelectTrigger>
            <SelectContent>
              {allProviders?.providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  if (!access?.hasAccess && !isSiteAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Organization</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have access to a provider organization. Please contact support if you
            believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Organization</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Provider not found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const providerStats = {
    totalReferrals: provider.tickets?.length || 0,
    pendingReferrals: provider.tickets?.filter(t => t.status === 'pending').length || 0,
    completedReferrals: provider.tickets?.filter(t => t.status === 'customer_need_addressed').length || 0,
    activeContacts: provider.contacts?.length || 0,
  }

  return (
    <div className="space-y-6">
      {isSiteAdmin && (
        <div className="max-w-md">
          <label className="text-sm font-medium mb-2 block">Preview as Provider:</label>
          <Select value={selectedProviderId || ''} onValueChange={setSelectedProviderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a provider..." />
            </SelectTrigger>
            <SelectContent>
              {allProviders?.providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold">{provider.name}</h1>
        <p className="text-muted-foreground">
          {isSiteAdmin
            ? 'Previewing provider portal view'
            : 'Manage your organization\'s information and referrals'}
        </p>
      </div>

      {/* Provider Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{providerStats.totalReferrals}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{providerStats.pendingReferrals}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{providerStats.completedReferrals}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{providerStats.activeContacts}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widget Engagement (last 30 days) */}
      {analytics && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Widget Engagement — Last 30 Days</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                    <p className="text-2xl font-bold">{analytics.last30Days.profile_view}</p>
                    <p className="text-xs text-muted-foreground">{analytics.allTime.profile_view} all time</p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone Clicks</p>
                    <p className="text-2xl font-bold">{analytics.last30Days.phone_click}</p>
                    <p className="text-xs text-muted-foreground">{analytics.allTime.phone_click} all time</p>
                  </div>
                  <Phone className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Website Clicks</p>
                    <p className="text-2xl font-bold">{analytics.last30Days.website_click}</p>
                    <p className="text-xs text-muted-foreground">{analytics.allTime.website_click} all time</p>
                  </div>
                  <Globe className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Directions Clicks</p>
                    <p className="text-2xl font-bold">{analytics.last30Days.directions_click}</p>
                    <p className="text-xs text-muted-foreground">{analytics.allTime.directions_click} all time</p>
                  </div>
                  <MapPin className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ProviderDetailTabs provider={provider} />
    </div>
  )
}
