'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { useProvider, useUpdateProvider, useNeedCategories, useCreateNote, useUpdateNote } from '@/lib/hooks/useProviders'
import { useUpdateTicket } from '@/lib/hooks/useTickets'
import { useUpdateProviderContact, useDeleteProviderContact, useInviteProviderContact } from '@/lib/hooks/useProviderContacts'
import { useCreateProviderEvent, useUpdateProviderEvent, useDeleteProviderEvent } from '@/lib/hooks/useProviderEvents'
import { SupportTicketsTab } from '@/components/support/support-tickets-tab'
import { ContactManagementDialog } from '@/components/providers/contact-management-dialog'
import type { ProviderDetail, NoteType, TicketStatus, ProviderContact, ProviderEvent } from '@/lib/types/linksy'
import { Plus, Copy, ExternalLink, Lock, MapPin, Pencil, Trash2, CheckCircle, Circle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { HostWidgetConfig } from '@/lib/types/linksy'

interface ProviderDetailTabsProps {
  provider: ProviderDetail
}

const sectorLabels: Record<string, string> = {
  nonprofit: 'Nonprofit',
  faith_based: 'Faith Based',
  government: 'Government',
  business: 'Business',
}

const noteTypeColors: Record<NoteType, string> = {
  general: 'bg-blue-100 text-blue-800',
  outreach: 'bg-green-100 text-green-800',
  update: 'bg-yellow-100 text-yellow-800',
  internal: 'bg-gray-100 text-gray-800',
}

const ticketStatusLabels: Record<TicketStatus, string> = {
  pending: 'Pending',
  customer_need_addressed: 'Need Addressed',
  wrong_organization_referred: 'Wrong Org',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
}

const emptyLocationForm = {
  name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  phone: '',
  is_primary: false,
}

function LocationsCard({ provider }: { provider: ProviderDetail }) {
  const [locations, setLocations] = useState(provider.locations || [])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(emptyLocationForm)
  const [editForm, setEditForm] = useState(emptyLocationForm)
  const [error, setError] = useState<string | null>(null)

  // Show map for primary or first geocoded location (OpenStreetMap embed — no API key required)
  const mapLocation = locations.find((l) => l.is_primary && l.latitude) || locations.find((l) => l.latitude)
  const osmEmbedUrl = mapLocation?.latitude && mapLocation?.longitude
    ? (() => {
        const lat = mapLocation.latitude!
        const lng = mapLocation.longitude!
        const delta = 0.008
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`
      })()
    : null

  const startEdit = (loc: typeof locations[0]) => {
    setEditingId(loc.id)
    setEditForm({
      name: loc.name || '',
      address_line1: loc.address_line1 || '',
      address_line2: loc.address_line2 || '',
      city: loc.city || '',
      state: loc.state || '',
      postal_code: loc.postal_code || '',
      phone: loc.phone || '',
      is_primary: loc.is_primary,
    })
  }

  const handleAdd = async () => {
    if (!form.address_line1) { setError('Address is required'); return }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/providers/${provider.id}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      const newLoc = await res.json()
      setLocations((prev) => [...prev, newLoc])
      setIsAdding(false)
      setForm(emptyLocationForm)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (locationId: string) => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/providers/${provider.id}/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      const updated = await res.json()
      setLocations((prev) => prev.map((l) => (l.id === locationId ? updated : l)))
      setEditingId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (locationId: string) => {
    if (!confirm('Delete this location?')) return
    const res = await fetch(`/api/providers/${provider.id}/locations/${locationId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setLocations((prev) => prev.filter((l) => l.id !== locationId))
    }
  }

  const LocationForm = ({
    values,
    onChange,
    onSave,
    onCancel,
    saveLabel = 'Save',
  }: {
    values: typeof emptyLocationForm
    onChange: (v: typeof emptyLocationForm) => void
    onSave: () => void
    onCancel: () => void
    saveLabel?: string
  }) => (
    <div className="space-y-3 rounded-md border p-4 bg-muted/30">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Location Name (optional)</Label>
          <Input
            placeholder="Main Office, Branch, etc."
            value={values.name}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            type="tel"
            placeholder="(555) 000-0000"
            value={values.phone}
            onChange={(e) => onChange({ ...values, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address Line 1 *</Label>
        <Input
          placeholder="123 Main St"
          value={values.address_line1}
          onChange={(e) => onChange({ ...values, address_line1: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address Line 2</Label>
        <Input
          placeholder="Suite 200"
          value={values.address_line2}
          onChange={(e) => onChange({ ...values, address_line2: e.target.value })}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs">City</Label>
          <Input
            placeholder="City"
            value={values.city}
            onChange={(e) => onChange({ ...values, city: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">State</Label>
          <Input
            placeholder="FL"
            maxLength={2}
            value={values.state}
            onChange={(e) => onChange({ ...values, state: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ZIP Code</Label>
          <Input
            placeholder="32204"
            value={values.postal_code}
            onChange={(e) => onChange({ ...values, postal_code: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="loc-is-primary"
          checked={values.is_primary}
          onCheckedChange={(c) => onChange({ ...values, is_primary: c as boolean })}
        />
        <label htmlFor="loc-is-primary" className="text-sm">Mark as primary location</label>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : saveLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </CardTitle>
          {!isAdding && (
            <Button size="sm" variant="outline" onClick={() => { setIsAdding(true); setError(null) }}>
              <Plus className="h-4 w-4 mr-1" /> Add Location
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <LocationForm
            values={form}
            onChange={setForm}
            onSave={handleAdd}
            onCancel={() => { setIsAdding(false); setForm(emptyLocationForm); setError(null) }}
            saveLabel="Add Location"
          />
        )}

        {locations.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No locations yet. Add one to enable map display and proximity search.
          </p>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <div key={loc.id}>
                {editingId === loc.id ? (
                  <LocationForm
                    values={editForm}
                    onChange={setEditForm}
                    onSave={() => handleUpdate(loc.id)}
                    onCancel={() => { setEditingId(null); setError(null) }}
                    saveLabel="Save Changes"
                  />
                ) : (
                  <div className="flex items-start justify-between rounded-md border px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {loc.is_primary && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Primary</Badge>
                        )}
                        {loc.name && <span className="font-medium text-sm">{loc.name}</span>}
                        {loc.geocoded_at ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3" /> Geocoded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Circle className="h-3 w-3" /> Not geocoded
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[loc.address_line1, loc.address_line2, loc.city, loc.state, loc.postal_code]
                          .filter(Boolean).join(', ') || 'No address'}
                      </p>
                      {loc.phone && <p className="text-sm text-muted-foreground">{loc.phone}</p>}
                    </div>
                    <div className="flex gap-1 ml-4 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(loc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(loc.id)}
                        className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Map for primary/first geocoded location */}
        {osmEmbedUrl && (
          <div className="overflow-hidden rounded-md border">
            <iframe
              src={osmEmbedUrl}
              width="100%"
              height="180"
              style={{ border: 0, display: 'block' }}
              title="Provider location map"
              loading="lazy"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryTab({ provider }: { provider: ProviderDetail }) {
  const updateProvider = useUpdateProvider()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    description: provider.description || '',
    phone: provider.phone || '',
    email: provider.email || '',
    website: provider.website || '',
    hours: provider.hours || '',
    referral_type: provider.referral_type,
    referral_instructions: provider.referral_instructions || '',
    project_status: provider.project_status,
    allow_auto_update: provider.allow_auto_update,
    sector: provider.sector,
    is_active: provider.is_active,
  })

  const handleSave = () => {
    updateProvider.mutate(
      { id: provider.id, ...formData },
      {
        onSuccess: () => {
          setIsEditing(false)
        },
      }
    )
  }

  const handleCancel = () => {
    setFormData({
      description: provider.description || '',
      phone: provider.phone || '',
      email: provider.email || '',
      website: provider.website || '',
      hours: provider.hours || '',
      referral_type: provider.referral_type,
      referral_instructions: provider.referral_instructions || '',
      project_status: provider.project_status,
      allow_auto_update: provider.allow_auto_update,
      sector: provider.sector,
      is_active: provider.is_active,
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} size="sm">
            Edit Provider
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              disabled={updateProvider.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm" disabled={updateProvider.isPending}>
              {updateProvider.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={5}
            disabled={!isEditing}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Hours of Operation</Label>
              <Input
                id="hours"
                type="text"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g. Mon-Fri 9am-5pm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Select
                value={formData.sector}
                onValueChange={(value) => setFormData({ ...formData, sector: value as any })}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nonprofit">Nonprofit</SelectItem>
                  <SelectItem value="faith_based">Faith Based</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_status">Project Status</Label>
              <Select
                value={formData.project_status}
                onValueChange={(value) => setFormData({ ...formData, project_status: value as any })}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sustaining">Sustaining</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="na">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked as boolean })
                }
                disabled={!isEditing}
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active Provider
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_auto_update"
                checked={formData.allow_auto_update}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_auto_update: checked as boolean })
                }
                disabled={!isEditing}
              />
              <label htmlFor="allow_auto_update" className="text-sm font-medium">
                Allow Auto Update
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral_type">Referral Type</Label>
            <Select
              value={formData.referral_type}
              onValueChange={(value) => setFormData({ ...formData, referral_type: value as any })}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="contact_directly">Contact Directly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.referral_type === 'contact_directly' && (
            <div className="space-y-2">
              <Label htmlFor="referral_instructions">Referral Instructions</Label>
              <Textarea
                value={formData.referral_instructions}
                onChange={(e) =>
                  setFormData({ ...formData, referral_instructions: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
                placeholder="Instructions for contacting this organization directly"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <LocationsCard provider={provider} />
    </div>
  )
}

function ContactsTab({ provider }: { provider: ProviderDetail }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedContact, setSelectedContact] = useState<ProviderContact | undefined>()
  const [isUpdating, setIsUpdating] = useState(false)

  const updateContact = useUpdateProviderContact()
  const deleteContact = useDeleteProviderContact()
  const inviteContact = useInviteProviderContact()

  const handleSetDefaultHandler = async (contactId: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/providers/${provider.id}/contacts/${contactId}/set-default-handler`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to set default handler')
      window.location.reload()
    } catch (error) {
      console.error('Error setting default handler:', error)
      alert('Failed to set default referral handler')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEdit = (contact: ProviderContact) => {
    setSelectedContact(contact)
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedContact(undefined)
    setDialogMode('create')
    setDialogOpen(true)
  }

  const handleArchive = async (contact: ProviderContact) => {
    if (!confirm(`Archive ${contact.user?.full_name || contact.user?.email}? They will no longer have access.`)) {
      return
    }

    try {
      await deleteContact.mutateAsync({
        providerId: provider.id,
        contactId: contact.id,
      })
    } catch (error) {
      alert('Failed to archive contact: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleInvite = async (contact: ProviderContact, email: string, name?: string) => {
    try {
      await inviteContact.mutateAsync({
        providerId: provider.id,
        contactId: contact.id,
        email,
        full_name: name,
      })
      alert('Invitation sent successfully!')
    } catch (error) {
      alert('Failed to send invitation: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {provider.contacts.length} active contact{provider.contacts.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {provider.contacts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border rounded-md">
          No contacts yet. Add your first contact to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {provider.contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    <div>
                      {contact.user?.full_name || '-'}
                      <div className="flex gap-1 mt-1">
                        {contact.is_primary_contact && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                        {contact.is_default_referral_handler && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Default Handler
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.user?.email || '-'}
                  </TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>{contact.job_title || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={contact.provider_role === 'admin' ? 'default' : 'secondary'}>
                      {contact.provider_role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contact.status === 'invited' ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Invited
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(contact)}
                      >
                        Edit
                      </Button>
                      {contact.status === 'invited' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInvite(contact, contact.user?.email || '', contact.user?.full_name || '')}
                          disabled={inviteContact.isPending}
                        >
                          Resend Invite
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(contact)}
                        disabled={deleteContact.isPending}
                      >
                        Archive
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContactManagementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        providerId={provider.id}
        contact={selectedContact}
        mode={dialogMode}
      />
    </div>
  )
}

function DetailsTab({ provider }: { provider: ProviderDetail }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            ['Facebook', provider.social_facebook],
            ['Instagram', provider.social_instagram],
            ['Twitter', provider.social_twitter],
            ['LinkedIn', provider.social_linkedin],
          ].map(([label, url]) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-xs"
                >
                  {url}
                </a>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legacy Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Legacy ID</span>
            <span>{provider.legacy_id || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Legacy Referral Count</span>
            <span>{provider.legacy_referral_count ?? '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(provider.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{new Date(provider.updated_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReferralsTab({ provider: initialProvider }: { provider: ProviderDetail }) {
  const router = useRouter()
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('open')
  const updateTicket = useUpdateTicket()

  // Refetch provider data with status filter
  const { data: provider, isLoading } = useProvider(initialProvider.id, statusFilter)
  const displayProvider = provider || initialProvider

  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
    updateTicket.mutate({ id: ticketId, status: newStatus })
  }

  const handleAssignmentChange = (ticketId: string, contactId: string) => {
    updateTicket.mutate({ id: ticketId, client_user_id: contactId })
  }

  // Use filtered data for display, but always calculate counts from initial full dataset
  const tickets = displayProvider?.tickets || []
  const contacts = displayProvider?.contacts || []

  // Always calculate counts from the initial provider data (full dataset)
  const allTickets = initialProvider?.tickets || []
  const openCount = allTickets.filter(t => t.status === 'pending').length
  const closedCount = allTickets.filter(t =>
    ['customer_need_addressed', 'unable_to_assist', 'client_unresponsive',
     'wrong_organization_referred', 'outside_of_scope', 'client_not_eligible'].includes(t.status)
  ).length
  const allCount = allTickets.length

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            statusFilter === 'open'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            statusFilter === 'all'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({allCount})
        </button>
        <button
          onClick={() => setStatusFilter('closed')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            statusFilter === 'closed'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Closed ({closedCount})
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No {statusFilter === 'all' ? '' : statusFilter} referrals for this provider.
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
        <Card key={ticket.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                    >
                      #{ticket.ticket_number}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {ticketStatusLabels[ticket.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticket.client_name || 'Anonymous'} • {ticket.need?.name || 'No need specified'}
                  </p>
                  {ticket.description_of_need && (
                    <p className="mt-2 text-sm line-clamp-2">{ticket.description_of_need}</p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => handleStatusChange(ticket.id, value as TicketStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ticketStatusLabels) as TicketStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {ticketStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Reassign To {contacts.length === 0 && '(No Contacts)'}
                  </Label>
                  <Select
                    value={ticket.client_user_id || 'unassigned'}
                    onValueChange={(value) => value !== 'unassigned' && handleAssignmentChange(ticket.id, value)}
                    disabled={contacts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.user_id ?? contact.id}>
                          {contact.user?.full_name || contact.user?.email || 'Unknown'}
                          {contact.is_primary_contact && ' (Primary)'}
                          {contact.is_default_referral_handler && ' (Default Handler)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  className="w-full"
                >
                  View Full Details & Add Comments
                </Button>
              </div>

              {ticket.client_phone && (
                <div className="text-sm">
                  <span className="font-medium">Phone:</span> {ticket.client_phone}
                </div>
              )}
              {ticket.client_email && (
                <div className="text-sm">
                  <span className="font-medium">Email:</span> {ticket.client_email}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
        </div>
      )}
    </div>
  )
}

function EventsTab({ provider }: { provider: ProviderDetail }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ProviderEvent | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    is_public: false,
  })

  const createEvent = useCreateProviderEvent(provider.id)
  const updateEvent = useUpdateProviderEvent(provider.id)
  const deleteEvent = useDeleteProviderEvent(provider.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingEvent) {
      await updateEvent.mutateAsync({ eventId: editingEvent.id, ...formData })
      setEditingEvent(null)
    } else {
      await createEvent.mutateAsync(formData)
      setIsAdding(false)
    }

    setFormData({ title: '', description: '', event_date: '', location: '', is_public: false })
  }

  const handleEdit = (event: ProviderEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date.split('T')[0],
      location: event.location || '',
      is_public: event.is_public,
    })
    setIsAdding(true)
  }

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await deleteEvent.mutateAsync(eventId)
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-4">
      {!isAdding ? (
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingEvent ? 'Edit Event' : 'Add New Event'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Community Food Drive"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_date">Event Date *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="123 Main St, City, State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Details about the event..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked as boolean })}
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Make this event public
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setEditingEvent(null)
                    setFormData({ title: '', description: '', event_date: '', location: '', is_public: false })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {provider.events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No events yet. Create your first event!
        </div>
      ) : (
        <div className="space-y-3">
          {provider.events.map((event) => (
            <Card key={event.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge className={statusColors[event.status]}>{event.status}</Badge>
                      {event.is_public && <Badge variant="outline">Public</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    )}
                    {event.description && (
                      <p className="mt-2 text-sm">{event.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesTab({ provider }: { provider: ProviderDetail }) {
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [newNoteType, setNewNoteType] = useState<NoteType>('general')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNotePrivate, setNewNotePrivate] = useState(false)
  const [editNoteType, setEditNoteType] = useState<NoteType>('general')
  const [editNoteContent, setEditNoteContent] = useState('')
  const [editNotePrivate, setEditNotePrivate] = useState(false)

  const createNote = useCreateNote(provider.id)
  const updateNote = useUpdateNote(provider.id)

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return

    try {
      await createNote.mutateAsync({
        note_type: newNoteType,
        content: newNoteContent,
        is_private: newNotePrivate,
      })
      setNewNoteContent('')
      setNewNoteType('general')
      setNewNotePrivate(false)
      setIsAddingNote(false)
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return

    try {
      await updateNote.mutateAsync({
        noteId,
        note_type: editNoteType,
        content: editNoteContent,
        is_private: editNotePrivate,
      })
      setEditingNoteId(null)
      setEditNoteContent('')
      setEditNoteType('general')
      setEditNotePrivate(false)
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const startEditingNote = (note: any) => {
    setEditingNoteId(note.id)
    setEditNoteType(note.note_type)
    setEditNoteContent(note.content)
    setEditNotePrivate(note.is_private)
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditNoteContent('')
    setEditNoteType('general')
    setEditNotePrivate(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Notes</h3>
        {!isAddingNote && (
          <Button onClick={() => setIsAddingNote(true)} size="sm">
            Add Note
          </Button>
        )}
      </div>

      {isAddingNote && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              <Label>Note Type</Label>
              <Select value={newNoteType} onValueChange={(val) => setNewNoteType(val as NoteType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter note content..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="new-note-private" checked={newNotePrivate} onCheckedChange={setNewNotePrivate} />
              <Label htmlFor="new-note-private" className="flex items-center gap-1 cursor-pointer">
                <Lock className="h-3 w-3" /> Private note
              </Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateNote} disabled={createNote.isPending}>
                {createNote.isPending ? 'Saving...' : 'Save Note'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNote(false)
                  setNewNoteContent('')
                  setNewNoteType('general')
                  setNewNotePrivate(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {provider.notes.length === 0 && !isAddingNote ? (
        <div className="py-12 text-center text-muted-foreground">
          No notes for this provider.
        </div>
      ) : (
        provider.notes.map((note) => (
          <Card key={note.id}>
            <CardContent className="pt-4">
              {editingNoteId === note.id ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Note Type</Label>
                    <Select value={editNoteType} onValueChange={(val) => setEditNoteType(val as NoteType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="outreach">Outreach</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="edit-note-private" checked={editNotePrivate} onCheckedChange={setEditNotePrivate} />
                    <Label htmlFor="edit-note-private" className="flex items-center gap-1 cursor-pointer">
                      <Lock className="h-3 w-3" /> Private note
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEditNote(note.id)} disabled={updateNote.isPending}>
                      {updateNote.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          noteTypeColors[note.note_type] || noteTypeColors.general
                        }`}
                      >
                        {note.note_type}
                      </span>
                      {note.is_private && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Lock className="h-3 w-3" /> Private
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {note.user?.full_name || note.user?.email || 'System'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => startEditingNote(note)}>
                      Edit
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function NeedsTab({ provider }: { provider: ProviderDetail }) {
  const { data: categories } = useNeedCategories()

  // Group provider needs by category
  const providerNeedIds = new Set(provider.provider_needs.map((pn) => pn.need_id))

  if (!categories) {
    return <div className="py-12 text-center text-muted-foreground">Loading needs...</div>
  }

  // Only show categories that have at least one need assigned
  const categoriesWithNeeds = categories
    .map((cat) => ({
      ...cat,
      assignedNeeds: (cat.needs || []).filter((n) => providerNeedIds.has(n.id)),
    }))
    .filter((cat) => cat.assignedNeeds.length > 0)

  if (categoriesWithNeeds.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No needs assigned to this provider.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categoriesWithNeeds.map((cat) => (
        <div key={cat.id}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {cat.name}
            {cat.airs_code && (
              <span className="font-mono text-xs font-normal text-blue-500">{cat.airs_code}</span>
            )}
          </h3>
          <div className="flex flex-wrap gap-2">
            {cat.assignedNeeds.map((need) => (
              <Badge key={need.id} variant="secondary">
                {need.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HostSettingsTab({ provider }: { provider: ProviderDetail }) {
  const updateProvider = useUpdateProvider()

  const [isHost, setIsHost] = useState(provider.is_host ?? false)
  const [embedActive, setEmbedActive] = useState(provider.host_embed_active ?? true)
  const [config, setConfig] = useState<HostWidgetConfig>(provider.host_widget_config ?? {})
  const [budget, setBudget] = useState<string>(
    provider.host_monthly_token_budget != null ? String(provider.host_monthly_token_budget) : ''
  )
  const [saved, setSaved] = useState(false)

  const widgetUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/find-help/${provider.slug}`
      : `/find-help/${provider.slug}`

  function copyUrl() {
    navigator.clipboard.writeText(widgetUrl)
  }

  function copyIframe() {
    const snippet = `<iframe src="${widgetUrl}" style="width:100%;height:700px;border:0;border-radius:8px;" title="Find Local Resources" allow="geolocation"></iframe>`
    navigator.clipboard.writeText(snippet)
  }

  async function handleSave() {
    await updateProvider.mutateAsync({
      id: provider.id,
      is_host: isHost,
      host_embed_active: embedActive,
      host_widget_config: config,
      host_monthly_token_budget: budget ? Number(budget) : null,
    } as any)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 py-4">
      {/* Enable / Disable toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Host Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Widget Hosting</Label>
              <p className="text-xs text-muted-foreground">
                Allow this provider to embed the Linksy widget on their site
              </p>
            </div>
            <Switch checked={isHost} onCheckedChange={setIsHost} />
          </div>
          {isHost && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Embed Active</Label>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable the widget without removing host status
                </p>
              </div>
              <Switch checked={embedActive} onCheckedChange={setEmbedActive} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget URL */}
      {isHost && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Widget URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs">
                {widgetUrl}
              </code>
              <Button variant="outline" size="icon" onClick={copyUrl} title="Copy URL">
                <Copy className="h-4 w-4" />
              </Button>
              <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" title="Preview widget">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">iframe embed snippet</Label>
              <Button variant="outline" size="sm" className="mt-1 w-full" onClick={copyIframe}>
                <Copy className="mr-2 h-3 w-3" />
                Copy iframe Snippet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget Configuration */}
      {isHost && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Widget Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Bot Name</Label>
              <Input
                value={config.bot_name ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, bot_name: e.target.value || undefined }))}
                placeholder="Linksy"
              />
            </div>
            <div className="space-y-1">
              <Label>Welcome Message</Label>
              <Textarea
                value={config.welcome_message ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, welcome_message: e.target.value || undefined }))}
                placeholder="Hello! I'm your community resource assistant…"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.primary_color ?? '#2563eb'}
                  onChange={(e) => setConfig((c) => ({ ...c, primary_color: e.target.value }))}
                  className="h-9 w-16 cursor-pointer rounded border"
                />
                <Input
                  value={config.primary_color ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, primary_color: e.target.value || undefined }))}
                  placeholder="#2563eb"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Logo URL</Label>
              <Input
                value={config.logo_url ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, logo_url: e.target.value || undefined }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget & Usage */}
      {isHost && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage & Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Searches This Month</p>
                <p className="text-2xl font-bold">
                  {(provider.host_searches_this_month ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tokens This Month</p>
                <p className="text-2xl font-bold">
                  {(provider.host_tokens_used_this_month ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Monthly Token Budget</Label>
              <p className="text-xs text-muted-foreground">
                Leave blank for unlimited. Widget is disabled when budget is reached.
              </p>
              <Input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={updateProvider.isPending}>
        {updateProvider.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Host Settings'}
      </Button>
    </div>
  )
}

export function ProviderDetailTabs({ provider }: ProviderDetailTabsProps) {
  return (
    <Tabs defaultValue="summary">
      <TabsList className="flex-wrap">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="tickets">
          Referrals {provider.tickets.length > 0 && `(${provider.tickets.length})`}
        </TabsTrigger>
        <TabsTrigger value="support">Support Tickets</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="notes">
          Notes {provider.notes.length > 0 && `(${provider.notes.length})`}
        </TabsTrigger>
        <TabsTrigger value="needs">
          Needs {provider.provider_needs.length > 0 && `(${provider.provider_needs.length})`}
        </TabsTrigger>
        <TabsTrigger value="host">Host Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
        <SummaryTab provider={provider} />
      </TabsContent>
      <TabsContent value="contacts">
        <ContactsTab provider={provider} />
      </TabsContent>
      <TabsContent value="details">
        <DetailsTab provider={provider} />
      </TabsContent>
      <TabsContent value="tickets">
        <ReferralsTab provider={provider} />
      </TabsContent>
      <TabsContent value="support">
        <SupportTicketsTab />
      </TabsContent>
      <TabsContent value="events">
        <EventsTab provider={provider} />
      </TabsContent>
      <TabsContent value="notes">
        <NotesTab provider={provider} />
      </TabsContent>
      <TabsContent value="needs">
        <NeedsTab provider={provider} />
      </TabsContent>
      <TabsContent value="host">
        <HostSettingsTab provider={provider} />
      </TabsContent>
    </Tabs>
  )
}
