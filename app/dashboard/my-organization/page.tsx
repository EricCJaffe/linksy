'use client'

import { useState } from 'react'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'
import { useProvider, useProviders, useProviderAnalytics, useUpdateProvider } from '@/lib/hooks/useProviders'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { ProviderDetailTabs } from '@/components/providers/provider-detail-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, FileText, CheckCircle, Users, Phone, Globe, MapPin, Eye, Pencil, X, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function MyOrganizationPage() {
  const { data: user } = useCurrentUser()
  const { data: access, isLoading: accessLoading } = useProviderAccess()
  const { data: allProviders } = useProviders({ limit: 1000 }, { enabled: user?.profile?.role === 'site_admin' })
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const updateProvider = useUpdateProvider()

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

  function startEditingProfile() {
    if (!provider) return
    setProfileForm({
      description: provider.description || '',
      phone: provider.phone || '',
      email: provider.email || '',
      website: provider.website || '',
      hours: provider.hours || '',
      social_facebook: provider.social_facebook || '',
      social_instagram: provider.social_instagram || '',
      social_twitter: provider.social_twitter || '',
      social_linkedin: provider.social_linkedin || '',
      referral_instructions: provider.referral_instructions || '',
    })
    setEditingProfile(true)
  }

  async function saveProfile() {
    if (!providerId) return
    try {
      await updateProvider.mutateAsync({ id: providerId, ...profileForm })
      toast({ title: 'Profile updated', description: 'Your organization profile has been saved.' })
      setEditingProfile(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to save profile.', variant: 'destructive' })
    }
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

      {/* Edit Profile */}
      {!isSiteAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Organization Profile</CardTitle>
              {!editingProfile ? (
                <Button variant="outline" size="sm" onClick={startEditingProfile}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingProfile(false)} disabled={updateProvider.isPending}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={saveProfile} disabled={updateProvider.isPending}>
                    <Check className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!editingProfile ? (
              <div className="grid gap-3 text-sm md:grid-cols-2">
                {provider.description && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-muted-foreground">Description: </span>
                    {provider.description}
                  </div>
                )}
                {provider.phone && <div><span className="font-medium text-muted-foreground">Phone: </span>{provider.phone}</div>}
                {provider.email && <div><span className="font-medium text-muted-foreground">Email: </span>{provider.email}</div>}
                {provider.website && <div><span className="font-medium text-muted-foreground">Website: </span>{provider.website}</div>}
                {provider.hours && <div className="md:col-span-2"><span className="font-medium text-muted-foreground">Hours: </span>{provider.hours}</div>}
                {provider.referral_instructions && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-muted-foreground">Referral Instructions: </span>
                    {provider.referral_instructions}
                  </div>
                )}
                {!provider.description && !provider.phone && !provider.email && !provider.website && (
                  <p className="text-muted-foreground md:col-span-2">No profile details yet. Click Edit Profile to add information.</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={profileForm.description}
                    onChange={e => setProfileForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your organization..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@org.org" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={profileForm.website} onChange={e => setProfileForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Hours</Label>
                  <Input value={profileForm.hours} onChange={e => setProfileForm(f => ({ ...f, hours: e.target.value }))} placeholder="Mon–Fri 9am–5pm" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Referral Instructions</Label>
                  <Textarea
                    rows={2}
                    value={profileForm.referral_instructions}
                    onChange={e => setProfileForm(f => ({ ...f, referral_instructions: e.target.value }))}
                    placeholder="Instructions for referrers..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Facebook</Label>
                  <Input value={profileForm.social_facebook} onChange={e => setProfileForm(f => ({ ...f, social_facebook: e.target.value }))} placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram</Label>
                  <Input value={profileForm.social_instagram} onChange={e => setProfileForm(f => ({ ...f, social_instagram: e.target.value }))} placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Twitter / X</Label>
                  <Input value={profileForm.social_twitter} onChange={e => setProfileForm(f => ({ ...f, social_twitter: e.target.value }))} placeholder="https://twitter.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label>LinkedIn</Label>
                  <Input value={profileForm.social_linkedin} onChange={e => setProfileForm(f => ({ ...f, social_linkedin: e.target.value }))} placeholder="https://linkedin.com/..." />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
