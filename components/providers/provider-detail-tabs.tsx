'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { FileAttachmentEdit, FileAttachmentDisplay } from '@/components/ui/file-attachment'
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
import { useProvider, useUpdateProvider, useNeedCategories, useCreateNote, useUpdateNote, useProviderAnalytics } from '@/lib/hooks/useProviders'
import { useUpdateTicket } from '@/lib/hooks/useTickets'
import { useUpdateProviderContact, useDeleteProviderContact, useInviteProviderContact } from '@/lib/hooks/useProviderContacts'
import { useCreateProviderEvent, useUpdateProviderEvent, useDeleteProviderEvent } from '@/lib/hooks/useProviderEvents'
import { EventCalendar, formatRecurrence } from '@/components/providers/event-calendar'
import { ContactManagementDialog } from '@/components/providers/contact-management-dialog'
import { ImageUpload } from '@/components/ui/image-upload'
import { WidgetPreview } from '@/components/widget/widget-preview'
import { uploadWidgetLogo, uploadNoteAttachment } from '@/lib/storage/upload'
import type { Provider, ProviderDetail, NoteType, NoteAttachment, TicketStatus, ProviderContact, ProviderEvent, ProviderContactMethod } from '@/lib/types/linksy'
import { Plus, Copy, ExternalLink, Lock, MapPin, Pencil, Trash2, CheckCircle, Circle, BarChart2, FileText, LayoutList, CalendarDays, RefreshCw, Pin, PinOff } from 'lucide-react'
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

const toAllowChoice = (value: boolean | null | undefined): 'allow' | 'do_not_allow' =>
  value === false ? 'do_not_allow' : 'allow'

const ticketStatusLabels: Record<TicketStatus, string> = {
  pending: 'Pending',
  customer_need_addressed: 'Need Addressed',
  wrong_organization_referred: 'Wrong Org',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
}

const ticketStatusBadgeClass: Record<TicketStatus, string> = {
  pending: 'border-blue-200 bg-blue-50 text-blue-700',
  customer_need_addressed: 'border-green-200 bg-green-50 text-green-700',
  wrong_organization_referred: 'border-orange-200 bg-orange-50 text-orange-700',
  outside_of_scope: 'border-slate-200 bg-slate-100 text-slate-700',
  client_not_eligible: 'border-amber-200 bg-amber-50 text-amber-800',
  unable_to_assist: 'border-red-200 bg-red-50 text-red-700',
  client_unresponsive: 'border-violet-200 bg-violet-50 text-violet-700',
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
  const router = useRouter()
  const updateProvider = useUpdateProvider()
  const createNote = useCreateNote(provider.id)
  const updateNote = useUpdateNote(provider.id)
  const { data: categories } = useNeedCategories()
  const [isEditing, setIsEditing] = useState(false)
  const primaryContact = provider.contacts.find((c) => c.is_primary_contact)
  const primaryLocation = provider.locations.find((l) => l.is_primary) || provider.locations[0] || null
  const providerAny = provider as any
  const supportsParentAccount =
    'parent_account' in providerAny ||
    'parent_account_name' in providerAny ||
    'parent_provider_id' in providerAny

  const [formData, setFormData] = useState({
    name: provider.name || '',
    description: provider.description || '',
    phone: provider.phone || '',
    email: provider.email || '',
    website: provider.website || '',
    social_facebook: provider.social_facebook || '',
    social_instagram: provider.social_instagram || '',
    social_twitter: provider.social_twitter || '',
    social_linkedin: provider.social_linkedin || '',
    hours: provider.hours || (providerAny.hours_of_operation ?? ''),
    referral_type: provider.referral_type,
    referral_instructions: provider.referral_instructions || '',
    contact_method: (providerAny.contact_method || 'all') as ProviderContactMethod,
    allow_contact_email: providerAny.allow_contact_email ?? true,
    allow_follow_email: providerAny.allow_follow_email ?? true,
    allow_bulk_email: providerAny.allow_bulk_email ?? true,
    allow_contact_phone: providerAny.allow_contact_phone ?? true,
    allow_contact_fax: providerAny.allow_contact_fax ?? true,
    allow_contact_mail: providerAny.allow_contact_mail ?? true,
    project_status: provider.project_status,
    allow_auto_update:
      provider.allow_auto_update ??
      providerAny.allow_auto_update_description ??
      false,
    sector: provider.sector,
    is_active: provider.is_active,
    provider_status: provider.provider_status || 'active',
    accepting_referrals: provider.accepting_referrals ?? true,
    parent_account:
      providerAny.parent_account ??
      providerAny.parent_account_name ??
      providerAny.parent_provider_id ??
      '',
  })
  const [selectedPrimaryContactId, setSelectedPrimaryContactId] = useState(primaryContact?.id || '')
  const [locationForm, setLocationForm] = useState({
    id: primaryLocation?.id || '',
    address_line1: primaryLocation?.address_line1 || '',
    address_line2: primaryLocation?.address_line2 || '',
    city: primaryLocation?.city || '',
    state: primaryLocation?.state || '',
    postal_code: primaryLocation?.postal_code || '',
    phone: primaryLocation?.phone || '',
    latitude: primaryLocation?.latitude || null,
    longitude: primaryLocation?.longitude || null,
  })
  const [noteType, setNoteType] = useState<NoteType>('update')
  const [isAddingTimelineNote, setIsAddingTimelineNote] = useState(false)
  const [newTimelineNote, setNewTimelineNote] = useState('')
  const [newTimelineNotePrivate, setNewTimelineNotePrivate] = useState(false)
  const [newTimelineNoteAttachments, setNewTimelineNoteAttachments] = useState<NoteAttachment[]>([])
  const [editingTimelineNoteId, setEditingTimelineNoteId] = useState<string | null>(null)
  const [editTimelineNoteType, setEditTimelineNoteType] = useState<NoteType>('update')
  const [editTimelineNoteContent, setEditTimelineNoteContent] = useState('')
  const [editTimelineNotePrivate, setEditTimelineNotePrivate] = useState(false)
  const [editTimelineNoteAttachments, setEditTimelineNoteAttachments] = useState<NoteAttachment[]>([])
  const [selectedNeedId, setSelectedNeedId] = useState('')
  const [isUpdatingNeeds, setIsUpdatingNeeds] = useState(false)

  const providerNeedIds = new Set(provider.provider_needs.map((pn) => pn.need_id))
  const allNeeds = (categories || []).flatMap((cat) => cat.needs || [])
  const unassignedNeeds = allNeeds.filter((need) => !providerNeedIds.has(need.id))
  const timelineNotes = [...provider.notes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
  const mapEmbedUrl =
    locationForm.latitude && locationForm.longitude
      ? (() => {
          const lat = locationForm.latitude as number
          const lng = locationForm.longitude as number
          const delta = 0.008
          return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`
        })()
      : null

  const applyPrimaryContact = async () => {
    const currentlyPrimaryId = primaryContact?.id || ''
    if (selectedPrimaryContactId === currentlyPrimaryId) return

    const changes = provider.contacts.filter((contact) => {
      const shouldBePrimary = contact.id === selectedPrimaryContactId
      return contact.is_primary_contact !== shouldBePrimary
    })

    await Promise.all(
      changes.map((contact) =>
        fetch(`/api/providers/${provider.id}/contacts/${contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_primary_contact: contact.id === selectedPrimaryContactId }),
        }).then((res) => {
          if (!res.ok) throw new Error('Failed to update primary contact')
          return res
        })
      )
    )
  }

  const applyPrimaryLocation = async () => {
    const payload = {
      address_line1: locationForm.address_line1 || null,
      address_line2: locationForm.address_line2 || null,
      city: locationForm.city || null,
      state: locationForm.state || null,
      postal_code: locationForm.postal_code || null,
      phone: locationForm.phone || null,
      is_primary: true,
    }

    if (
      !payload.address_line1 &&
      !payload.address_line2 &&
      !payload.city &&
      !payload.state &&
      !payload.postal_code &&
      !payload.phone
    ) {
      return
    }

    const endpoint = locationForm.id
      ? `/api/providers/${provider.id}/locations/${locationForm.id}`
      : `/api/providers/${provider.id}/locations`
    const method = locationForm.id ? 'PATCH' : 'POST'

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to update address')

    const savedLocation = await res.json()
    setLocationForm((prev) => ({
      ...prev,
      id: savedLocation.id || prev.id,
      latitude: savedLocation.latitude ?? prev.latitude,
      longitude: savedLocation.longitude ?? prev.longitude,
    }))
  }

  const handleSave = async () => {
    const payload: { id: string } & Partial<Provider> = {
      id: provider.id,
      name: formData.name,
      description: formData.description,
      phone: formData.phone,
      email: formData.email,
      website: formData.website,
      social_facebook: formData.social_facebook,
      social_instagram: formData.social_instagram,
      social_twitter: formData.social_twitter,
      social_linkedin: formData.social_linkedin,
      referral_type: formData.referral_type,
      referral_instructions: formData.referral_instructions,
      project_status: formData.project_status,
      sector: formData.sector,
      is_active: formData.is_active,
    }

    if ('hours' in providerAny) payload.hours = formData.hours
    if ('hours_of_operation' in providerAny) (payload as any).hours_of_operation = formData.hours

    if (supportsParentAccount) {
      if ('parent_account' in providerAny) (payload as any).parent_account = formData.parent_account || null
      if ('parent_account_name' in providerAny) (payload as any).parent_account_name = formData.parent_account || null
      if ('parent_provider_id' in providerAny) (payload as any).parent_provider_id = formData.parent_account || null
    }

    if ('allow_auto_update' in providerAny) payload.allow_auto_update = formData.allow_auto_update
    if ('allow_auto_update_description' in providerAny) {
      (payload as any).allow_auto_update_description = formData.allow_auto_update
    }
    if ('contact_method' in providerAny) (payload as any).contact_method = formData.contact_method
    if ('allow_contact_email' in providerAny) (payload as any).allow_contact_email = formData.allow_contact_email
    if ('allow_follow_email' in providerAny) (payload as any).allow_follow_email = formData.allow_follow_email
    if ('allow_bulk_email' in providerAny) (payload as any).allow_bulk_email = formData.allow_bulk_email
    if ('allow_contact_phone' in providerAny) (payload as any).allow_contact_phone = formData.allow_contact_phone
    if ('allow_contact_fax' in providerAny) (payload as any).allow_contact_fax = formData.allow_contact_fax
    if ('allow_contact_mail' in providerAny) (payload as any).allow_contact_mail = formData.allow_contact_mail

    updateProvider.mutate(payload, {
      onSuccess: async () => {
        try {
          await applyPrimaryContact()
          await applyPrimaryLocation()
          setIsEditing(false)
          router.refresh()
        } catch (error) {
          console.error('Failed to save summary related changes:', error)
          alert('Provider saved, but some contact/address updates failed. Please retry.')
        }
      },
    })
  }

  const handleAddNeed = async () => {
    if (!selectedNeedId) return
    setIsUpdatingNeeds(true)
    try {
      const res = await fetch(`/api/providers/${provider.id}/needs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ need_id: selectedNeedId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add need')
      }
      setSelectedNeedId('')
      router.refresh()
    } catch (error) {
      console.error('Failed to add need:', error)
      alert('Failed to add need')
    } finally {
      setIsUpdatingNeeds(false)
    }
  }

  const handleRemoveNeed = async (needId: string) => {
    setIsUpdatingNeeds(true)
    try {
      const res = await fetch(`/api/providers/${provider.id}/needs?need_id=${encodeURIComponent(needId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove need')
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to remove need:', error)
      alert('Failed to remove need')
    } finally {
      setIsUpdatingNeeds(false)
    }
  }

  const handleAddTimelineNote = async () => {
    const plainText = newTimelineNote.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!plainText) return
    try {
      await createNote.mutateAsync({
        note_type: noteType,
        content: newTimelineNote,
        is_private: newTimelineNotePrivate,
        attachments: newTimelineNoteAttachments.length > 0 ? newTimelineNoteAttachments : undefined,
      })
      setNewTimelineNote('')
      setNoteType('update')
      setNewTimelineNotePrivate(false)
      setNewTimelineNoteAttachments([])
      setIsAddingTimelineNote(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to create note:', error)
      alert('Failed to add note')
    }
  }

  const startEditingTimelineNote = (note: ProviderDetail['notes'][number]) => {
    setEditingTimelineNoteId(note.id)
    setEditTimelineNoteType(note.note_type)
    setEditTimelineNoteContent(note.content)
    setEditTimelineNotePrivate(note.is_private)
    setEditTimelineNoteAttachments(note.attachments || [])
  }

  const cancelEditingTimelineNote = () => {
    setEditingTimelineNoteId(null)
    setEditTimelineNoteType('update')
    setEditTimelineNoteContent('')
    setEditTimelineNotePrivate(false)
    setEditTimelineNoteAttachments([])
  }

  const handleSaveTimelineNote = async (noteId: string) => {
    const plainText = editTimelineNoteContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!plainText) return

    try {
      await updateNote.mutateAsync({
        noteId,
        note_type: editTimelineNoteType,
        content: editTimelineNoteContent,
        is_private: editTimelineNotePrivate,
        attachments: editTimelineNoteAttachments,
      })
      cancelEditingTimelineNote()
      router.refresh()
    } catch (error) {
      console.error('Failed to update note:', error)
      alert('Failed to update note')
    }
  }

  const handleDeleteTimelineNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return
    try {
      const res = await fetch(`/api/providers/${provider.id}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || 'Failed to delete note')
      }
      if (editingTimelineNoteId === noteId) cancelEditingTimelineNote()
      router.refresh()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert('Failed to delete note')
    }
  }

  const handlePinTimelineNote = async (note: ProviderDetail['notes'][number]) => {
    try {
      await updateNote.mutateAsync({
        noteId: note.id,
        is_pinned: !note.is_pinned,
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to update pinned state:', error)
      alert('Failed to pin note')
    }
  }

  const copyTimelineNote = async (html: string) => {
    const plainText = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    try {
      await navigator.clipboard.writeText(plainText)
    } catch (error) {
      console.error('Failed to copy note:', error)
      alert('Failed to copy note')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: provider.name || '',
      description: provider.description || '',
      phone: provider.phone || '',
      email: provider.email || '',
      website: provider.website || '',
      social_facebook: provider.social_facebook || '',
      social_instagram: provider.social_instagram || '',
      social_twitter: provider.social_twitter || '',
      social_linkedin: provider.social_linkedin || '',
      hours: provider.hours || (providerAny.hours_of_operation ?? ''),
      referral_type: provider.referral_type,
      referral_instructions: provider.referral_instructions || '',
      contact_method: (providerAny.contact_method || 'all') as ProviderContactMethod,
      allow_contact_email: providerAny.allow_contact_email ?? true,
      allow_follow_email: providerAny.allow_follow_email ?? true,
      allow_bulk_email: providerAny.allow_bulk_email ?? true,
      allow_contact_phone: providerAny.allow_contact_phone ?? true,
      allow_contact_fax: providerAny.allow_contact_fax ?? true,
      allow_contact_mail: providerAny.allow_contact_mail ?? true,
      project_status: provider.project_status,
      allow_auto_update:
        provider.allow_auto_update ??
        providerAny.allow_auto_update_description ??
        false,
      sector: provider.sector,
      is_active: provider.is_active,
      provider_status: provider.provider_status || 'active',
      accepting_referrals: provider.accepting_referrals ?? true,
      parent_account:
        providerAny.parent_account ??
        providerAny.parent_account_name ??
        providerAny.parent_provider_id ??
        '',
    })
    setSelectedPrimaryContactId(primaryContact?.id || '')
    setLocationForm({
      id: primaryLocation?.id || '',
      address_line1: primaryLocation?.address_line1 || '',
      address_line2: primaryLocation?.address_line2 || '',
      city: primaryLocation?.city || '',
      state: primaryLocation?.state || '',
      postal_code: primaryLocation?.postal_code || '',
      phone: primaryLocation?.phone || '',
      latitude: primaryLocation?.latitude || null,
      longitude: primaryLocation?.longitude || null,
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
          <RichTextEditor
            value={formData.description}
            onChange={(html) => setFormData({ ...formData, description: html })}
            disabled={!isEditing}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider_name">Nonprofit Name</Label>
                <Input
                  id="provider_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
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
                <Label htmlFor="primary_contact">Primary Contact</Label>
                <Select
                  value={selectedPrimaryContactId || '__none'}
                  onValueChange={(value) =>
                    setSelectedPrimaryContactId(value === '__none' ? '' : value)
                  }
                  disabled={!isEditing || provider.contacts.length === 0}
                >
                  <SelectTrigger id="primary_contact">
                    <SelectValue placeholder="Select primary contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No primary contact</SelectItem>
                    {provider.contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.user?.full_name || contact.user?.email || 'Unknown contact'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="social_facebook">Facebook</Label>
                <Input
                  id="social_facebook"
                  type="url"
                  value={formData.social_facebook}
                  onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="social_instagram">Instagram</Label>
                <Input
                  id="social_instagram"
                  type="url"
                  value={formData.social_instagram}
                  onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="social_twitter">Twitter / X</Label>
                <Input
                  id="social_twitter"
                  type="url"
                  value={formData.social_twitter}
                  onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://x.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="social_linkedin">LinkedIn</Label>
                <Input
                  id="social_linkedin"
                  type="url"
                  value={formData.social_linkedin}
                  onChange={(e) => setFormData({ ...formData, social_linkedin: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_account">Parent Account</Label>
                <Input
                  id="parent_account"
                  value={formData.parent_account}
                  onChange={(e) => setFormData({ ...formData, parent_account: e.target.value })}
                  disabled={!isEditing || !supportsParentAccount}
                  placeholder={supportsParentAccount ? 'Parent account' : 'Not modeled in current schema'}
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
              <CardTitle className="text-base">Address & Map</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={locationForm.address_line1}
                  onChange={(e) => setLocationForm({ ...locationForm, address_line1: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={locationForm.address_line2}
                  onChange={(e) => setLocationForm({ ...locationForm, address_line2: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={locationForm.state}
                    onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={locationForm.postal_code}
                    onChange={(e) => setLocationForm({ ...locationForm, postal_code: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_phone">Location Phone</Label>
                <Input
                  id="location_phone"
                  value={locationForm.phone}
                  onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              {mapEmbedUrl ? (
                <div className="overflow-hidden rounded-md border">
                  <iframe
                    src={mapEmbedUrl}
                    width="100%"
                    height="220"
                    style={{ border: 0, display: 'block' }}
                    title="Provider location map"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Map will appear after a location is geocoded.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Needs Addressed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {provider.provider_needs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No needs assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {provider.provider_needs.map((providerNeed) => (
                    <div
                      key={providerNeed.id}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
                    >
                      <span>{providerNeed.need?.name || providerNeed.need_id}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveNeed(providerNeed.need_id)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          disabled={isUpdatingNeeds}
                          aria-label={`Remove ${providerNeed.need?.name || 'need'}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isEditing && (
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Select value={selectedNeedId} onValueChange={setSelectedNeedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add a need..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedNeeds.map((need) => (
                        <SelectItem key={need.id} value={need.id}>
                          {need.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddNeed}
                    disabled={!selectedNeedId || isUpdatingNeeds}
                  >
                    Add Need
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Timeline / Recent Notes</CardTitle>
                {!isAddingTimelineNote && (
                  <Button size="sm" variant="outline" onClick={() => setIsAddingTimelineNote(true)}>
                    Add Note
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingTimelineNote && (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="timeline_note">Add Timeline Note</Label>
                  <div className="grid gap-2">
                    <Select value={noteType} onValueChange={(val) => setNoteType(val as NoteType)}>
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
                    <RichTextEditor
                      value={newTimelineNote}
                      onChange={setNewTimelineNote}
                      placeholder="Add a dated note for this provider..."
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        id="timeline-note-private"
                        checked={newTimelineNotePrivate}
                        onCheckedChange={setNewTimelineNotePrivate}
                      />
                      <Label htmlFor="timeline-note-private" className="flex items-center gap-1 cursor-pointer">
                        <Lock className="h-3 w-3" /> Private note
                      </Label>
                    </div>
                    <FileAttachmentEdit
                      value={newTimelineNoteAttachments}
                      onChange={setNewTimelineNoteAttachments}
                      uploadFn={(file) => uploadNoteAttachment(file, provider.id)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleAddTimelineNote}
                        disabled={createNote.isPending}
                      >
                        {createNote.isPending ? 'Adding…' : 'Add'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddingTimelineNote(false)
                          setNewTimelineNote('')
                          setNewTimelineNotePrivate(false)
                          setNoteType('update')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {timelineNotes.length === 0 && !isAddingTimelineNote ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No notes exist yet. Add one from this panel.
                </div>
              ) : (
                <div className="space-y-3">
                  {timelineNotes.map((note) => (
                    <div key={note.id} className="rounded-md border p-3">
                      {editingTimelineNoteId === note.id ? (
                        <div className="space-y-3">
                          <Select
                            value={editTimelineNoteType}
                            onValueChange={(val) => setEditTimelineNoteType(val as NoteType)}
                          >
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
                          <RichTextEditor
                            value={editTimelineNoteContent}
                            onChange={setEditTimelineNoteContent}
                          />
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`timeline-edit-private-${note.id}`}
                              checked={editTimelineNotePrivate}
                              onCheckedChange={setEditTimelineNotePrivate}
                            />
                            <Label
                              htmlFor={`timeline-edit-private-${note.id}`}
                              className="flex items-center gap-1 cursor-pointer"
                            >
                              <Lock className="h-3 w-3" /> Private note
                            </Label>
                          </div>
                          <FileAttachmentEdit
                            value={editTimelineNoteAttachments}
                            onChange={setEditTimelineNoteAttachments}
                            uploadFn={(file) => uploadNoteAttachment(file, provider.id)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveTimelineNote(note.id)}
                              disabled={updateNote.isPending}
                            >
                              {updateNote.isPending ? 'Saving…' : 'Save'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingTimelineNote}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge
                                className={`${noteTypeColors[note.note_type] || noteTypeColors.general} border-transparent`}
                              >
                                {note.note_type}
                              </Badge>
                              {note.is_pinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
                                  <Pin className="h-3 w-3" /> Pinned
                                </span>
                              )}
                              {note.is_private && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  <Lock className="h-3 w-3" /> Private
                                </span>
                              )}
                              <span>{new Date(note.created_at).toLocaleString()}</span>
                              <span>•</span>
                              <span>Added by {note.user?.full_name || note.user?.email || 'Unknown user'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handlePinTimelineNote(note)} title={note.is_pinned ? 'Unpin note' : 'Pin note'}>
                                {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => copyTimelineNote(note.content)} title="Copy note">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => startEditingTimelineNote(note)} title="Edit note">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTimelineNote(note.id)} title="Delete note">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <RichTextDisplay content={note.content} className="text-sm" />
                          <FileAttachmentDisplay attachments={note.attachments} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <RichTextEditor
                value={formData.referral_instructions}
                onChange={(html) =>
                  setFormData({ ...formData, referral_instructions: html })
                }
                disabled={!isEditing}
                placeholder="Instructions for contacting this organization directly"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_method">Contact Method</Label>
            <Select
              value={formData.contact_method}
              onValueChange={(value) =>
                setFormData({ ...formData, contact_method: value as ProviderContactMethod })
              }
              disabled={!isEditing}
            >
              <SelectTrigger id="contact_method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="fax">Fax</SelectItem>
                <SelectItem value="mail">Mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="allow_contact_email">Email</Label>
              <Select
                value={toAllowChoice(formData.allow_contact_email)}
                onValueChange={(value) =>
                  setFormData({ ...formData, allow_contact_email: value === 'allow' })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="allow_contact_email">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="do_not_allow">Do Not Allow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allow_follow_email">Follow Email</Label>
              <Select
                value={toAllowChoice(formData.allow_follow_email)}
                onValueChange={(value) =>
                  setFormData({ ...formData, allow_follow_email: value === 'allow' })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="allow_follow_email">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="do_not_allow">Do Not Allow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allow_bulk_email">Bulk Email</Label>
              <Select
                value={toAllowChoice(formData.allow_bulk_email)}
                onValueChange={(value) =>
                  setFormData({ ...formData, allow_bulk_email: value === 'allow' })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="allow_bulk_email">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="do_not_allow">Do Not Allow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allow_contact_phone">Phone</Label>
              <Select
                value={toAllowChoice(formData.allow_contact_phone)}
                onValueChange={(value) =>
                  setFormData({ ...formData, allow_contact_phone: value === 'allow' })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="allow_contact_phone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="do_not_allow">Do Not Allow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allow_contact_fax">Fax</Label>
              <Select
                value={toAllowChoice(formData.allow_contact_fax)}
                onValueChange={(value) =>
                  setFormData({ ...formData, allow_contact_fax: value === 'allow' })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="allow_contact_fax">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="do_not_allow">Do Not Allow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allow_contact_mail">Mail</Label>
              <Select
                value={toAllowChoice(formData.allow_contact_mail)}
                onValueChange={(value) =>
                  setFormData({ ...formData, allow_contact_mail: value === 'allow' })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="allow_contact_mail">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="do_not_allow">Do Not Allow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <LocationsCard provider={provider} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            LLM Context Card
          </CardTitle>
        </CardHeader>
        <CardContent>
          {provider.llm_context_card ? (
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs font-mono leading-relaxed">
              {provider.llm_context_card}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              No context card generated yet. Go to Admin Console → Statistics to generate one.
            </p>
          )}
        </CardContent>
      </Card>
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
  const { data: analytics } = useProviderAnalytics(provider.id)

  const profileViews = analytics?.allTime.profile_view ?? 0
  const totalClicks = (analytics?.allTime.phone_click ?? 0)
    + (analytics?.allTime.website_click ?? 0)
    + (analytics?.allTime.directions_click ?? 0)
  const ctr = profileViews > 0 ? Math.round((totalClicks / profileViews) * 100) : 0
  const conversionRate = profileViews > 0
    ? Math.round(((provider.tickets?.length ?? 0) / profileViews) * 100)
    : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reporting Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
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

      {/* Search Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4" />
            Search Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Interactions</span>
            <span className="font-medium">{analytics?.allTime.total ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profile Views</span>
            <span className="font-medium">{profileViews || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Click-through Rate</span>
            <span className="font-medium">{profileViews > 0 ? `${ctr}%` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Referral Conversion</span>
            <span className="font-medium">{profileViews > 0 ? `${conversionRate}%` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone Clicks</span>
            <span>{analytics?.allTime.phone_click ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Website Clicks</span>
            <span>{analytics?.allTime.website_click ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Directions Clicks</span>
            <span>{analytics?.allTime.directions_click ?? '—'}</span>
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
                    <Badge
                      variant="outline"
                      className={`text-xs ${ticketStatusBadgeClass[ticket.status]}`}
                    >
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
  const [calendarView, setCalendarView] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    is_public: false,
    recurrence_rule: '' as string,
  })

  const createEvent = useCreateProviderEvent(provider.id)
  const updateEvent = useUpdateProviderEvent(provider.id)
  const deleteEvent = useDeleteProviderEvent(provider.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      ...formData,
      recurrence_rule: formData.recurrence_rule || null,
    }
    if (editingEvent) {
      await updateEvent.mutateAsync({ eventId: editingEvent.id, ...payload })
      setEditingEvent(null)
    } else {
      await createEvent.mutateAsync(payload)
      setIsAdding(false)
    }

    setFormData({ title: '', description: '', event_date: '', location: '', is_public: false, recurrence_rule: '' })
  }

  const handleEdit = (event: ProviderEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date.split('T')[0],
      location: event.location || '',
      is_public: event.is_public,
      recurrence_rule: event.recurrence_rule || '',
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
      <div className="flex items-center justify-between">
        {!isAdding ? (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <Button
            variant={calendarView ? 'ghost' : 'secondary'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setCalendarView(false)}
          >
            <LayoutList className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant={calendarView ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setCalendarView(true)}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Calendar
          </Button>
        </div>
      </div>
      {isAdding && (
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
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
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
              <div className="space-y-2">
                <Label htmlFor="recurrence_rule">Recurrence</Label>
                <Select
                  value={formData.recurrence_rule || 'none'}
                  onValueChange={(val) => setFormData({ ...formData, recurrence_rule: val === 'none' ? '' : val })}
                >
                  <SelectTrigger id="recurrence_rule">
                    <SelectValue placeholder="No recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No recurrence</SelectItem>
                    <SelectItem value="FREQ=DAILY">Daily</SelectItem>
                    <SelectItem value="FREQ=WEEKLY">Weekly</SelectItem>
                    <SelectItem value="FREQ=WEEKLY;INTERVAL=2">Bi-weekly</SelectItem>
                    <SelectItem value="FREQ=MONTHLY">Monthly</SelectItem>
                    <SelectItem value="FREQ=YEARLY">Annually</SelectItem>
                  </SelectContent>
                </Select>
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
                    setFormData({ title: '', description: '', event_date: '', location: '', is_public: false, recurrence_rule: '' })
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
      ) : calendarView ? (
        <EventCalendar events={provider.events} />
      ) : (
        <div className="space-y-3">
          {provider.events.map((event) => {
            const recurrenceLabel = formatRecurrence(event.recurrence_rule)
            return (
              <Card key={event.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge className={statusColors[event.status]}>{event.status}</Badge>
                        {event.is_public && <Badge variant="outline">Public</Badge>}
                        {recurrenceLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            <RefreshCw className="h-3 w-3" />
                            {recurrenceLabel}
                          </span>
                        )}
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
                        <div className="mt-2">
                          <RichTextDisplay content={event.description} className="text-sm" />
                        </div>
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
            )
          })}
        </div>
      )}
    </div>
  )
}

function NotesTab({ provider }: { provider: ProviderDetail }) {
  const router = useRouter()
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [newNoteType, setNewNoteType] = useState<NoteType>('general')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNotePrivate, setNewNotePrivate] = useState(false)
  const [newNoteAttachments, setNewNoteAttachments] = useState<NoteAttachment[]>([])
  const [editNoteType, setEditNoteType] = useState<NoteType>('general')
  const [editNoteContent, setEditNoteContent] = useState('')
  const [editNotePrivate, setEditNotePrivate] = useState(false)
  const [editNoteAttachments, setEditNoteAttachments] = useState<NoteAttachment[]>([])

  const createNote = useCreateNote(provider.id)
  const updateNote = useUpdateNote(provider.id)

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return

    try {
      await createNote.mutateAsync({
        note_type: newNoteType,
        content: newNoteContent,
        is_private: newNotePrivate,
        attachments: newNoteAttachments.length > 0 ? newNoteAttachments : undefined,
      })
      setNewNoteContent('')
      setNewNoteType('general')
      setNewNotePrivate(false)
      setNewNoteAttachments([])
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
        attachments: editNoteAttachments,
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
    setEditNoteAttachments(note.attachments || [])
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditNoteContent('')
    setEditNoteType('general')
    setEditNotePrivate(false)
    setEditNoteAttachments([])
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return
    try {
      const res = await fetch(`/api/providers/${provider.id}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || 'Failed to delete note')
      }
      if (editingNoteId === noteId) cancelEditing()
      router.refresh()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert('Failed to delete note')
    }
  }

  const handlePinNote = async (note: ProviderDetail['notes'][number]) => {
    try {
      await updateNote.mutateAsync({
        noteId: note.id,
        is_pinned: !note.is_pinned,
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to update pinned state:', error)
      alert('Failed to pin note')
    }
  }

  const copyNoteContent = async (html: string) => {
    const plainText = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    try {
      await navigator.clipboard.writeText(plainText)
    } catch (error) {
      console.error('Failed to copy note:', error)
      alert('Failed to copy note')
    }
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
              <RichTextEditor
                value={newNoteContent}
                onChange={setNewNoteContent}
                placeholder="Enter note content..."
              />
            </div>
            <FileAttachmentEdit
              value={newNoteAttachments}
              onChange={setNewNoteAttachments}
              uploadFn={(file) => uploadNoteAttachment(file, provider.id)}
            />
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
                  setNewNoteAttachments([])
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
                    <RichTextEditor
                      value={editNoteContent}
                      onChange={setEditNoteContent}
                    />
                  </div>
                  <FileAttachmentEdit
                    value={editNoteAttachments}
                    onChange={setEditNoteAttachments}
                    uploadFn={(file) => uploadNoteAttachment(file, provider.id)}
                  />
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
                      {note.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                      {note.is_private && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Lock className="h-3 w-3" /> Private
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Added by {note.user?.full_name || note.user?.email || 'Unknown user'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handlePinNote(note)} title={note.is_pinned ? 'Unpin note' : 'Pin note'}>
                        {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => copyNoteContent(note.content)} title="Copy note">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEditingNote(note)} title="Edit note">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteNote(note.id)} title="Delete note">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <RichTextDisplay content={note.content} className="text-sm" />
                  <FileAttachmentDisplay attachments={note.attachments} />
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
          <CardContent>
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Controls column */}
              <div className="space-y-4">
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
                  <RichTextEditor
                    value={config.welcome_message ?? ''}
                    onChange={(html) => setConfig((c) => ({ ...c, welcome_message: html || undefined }))}
                    placeholder="Hello! I'm your community resource assistant…"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Widget Logo</Label>
                  <ImageUpload
                    inputId="widget-logo-upload"
                    value={config.logo_url}
                    onChange={(url) => setConfig((c) => ({ ...c, logo_url: url }))}
                    onRemove={() => setConfig((c) => ({ ...c, logo_url: undefined }))}
                    uploadFn={(file) => uploadWidgetLogo(file, provider.id)}
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
                  <Label>Header Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.header_bg_color ?? '#ffffff'}
                      onChange={(e) => setConfig((c) => ({ ...c, header_bg_color: e.target.value }))}
                      className="h-9 w-16 cursor-pointer rounded border"
                    />
                    <Input
                      value={config.header_bg_color ?? ''}
                      onChange={(e) => setConfig((c) => ({ ...c, header_bg_color: e.target.value || undefined }))}
                      placeholder="#ffffff"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Accent / Secondary Color</Label>
                  <p className="text-xs text-muted-foreground">Used for links, distance badges, and highlights</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.secondary_color ?? config.primary_color ?? '#2563eb'}
                      onChange={(e) => setConfig((c) => ({ ...c, secondary_color: e.target.value }))}
                      className="h-9 w-16 cursor-pointer rounded border"
                    />
                    <Input
                      value={config.secondary_color ?? ''}
                      onChange={(e) => setConfig((c) => ({ ...c, secondary_color: e.target.value || undefined }))}
                      placeholder="Same as primary"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Font Family</Label>
                  <Select
                    value={config.font_family ?? 'system-default'}
                    onValueChange={(value) => setConfig((c) => ({ ...c, font_family: value === 'system-default' ? undefined : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="System default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system-default">System default</SelectItem>
                      <SelectItem value="Inter, system-ui, sans-serif">Inter</SelectItem>
                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                      <SelectItem value="Arial, Helvetica, sans-serif">Arial</SelectItem>
                      <SelectItem value="'Courier New', Courier, monospace">Courier New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Search Rate Limit (per minute)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.search_rate_limit_per_minute ?? ''}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          search_rate_limit_per_minute: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="60"
                    />
                    <p className="text-xs text-muted-foreground">Per host + IP. Default is 60.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Referral Rate Limit (per hour)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.ticket_rate_limit_per_hour ?? ''}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          ticket_rate_limit_per_hour: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder="20"
                    />
                    <p className="text-xs text-muted-foreground">Per host + IP. Default is 20.</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Limits apply independently per host and per client IP address. They are used for abuse protection and
                  do not require customer API keys.
                </p>
              </div>

              {/* Preview column */}
              <div className="flex flex-col items-center gap-2">
                <Label className="text-xs text-muted-foreground self-start">Live Preview</Label>
                <WidgetPreview config={config} providerName={provider.name} />
              </div>
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
        <TabsTrigger value="tickets">
          Referrals {provider.tickets.length > 0 && `(${provider.tickets.length})`}
        </TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="details">Reporting</TabsTrigger>
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
