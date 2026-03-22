'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User,
  Plus,
  Lock,
  Globe,
  StickyNote,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { CallLogForm } from '@/components/providers/call-log-form'
import { CallLogDisplay } from '@/components/providers/call-log-display'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import type { NoteType } from '@/lib/types/linksy'
import { formatPhoneWithExt, phoneToTel } from '@/lib/utils/phone'

interface ContactDetail {
  id: string
  provider_id: string
  user_id: string | null
  email: string | null
  full_name: string | null
  job_title: string | null
  phone: string | null
  phone_extension: string | null
  contact_type: string
  provider_role: string
  is_primary_contact: boolean
  is_default_referral_handler: boolean
  status: string
  created_at: string
  display_name: string
  display_email: string | null
  provider: { id: string; name: string; is_active: boolean } | null
}

interface ContactNote {
  id: string
  note_type: NoteType
  content: string
  is_private: boolean
  call_log_data?: any
  created_at: string
  updated_at?: string
  user?: { full_name: string | null; email: string }
}

const noteTypeColors: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  outreach: 'bg-green-100 text-green-800',
  update: 'bg-yellow-100 text-yellow-800',
  internal: 'bg-gray-100 text-gray-800',
  call_log: 'bg-purple-100 text-purple-800',
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingNotes, setIsLoadingNotes] = useState(true)

  // Note form state
  const [showAddNote, setShowAddNote] = useState(false)
  const [showCallLog, setShowCallLog] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('general')
  const [notePrivate, setNotePrivate] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const res = await fetch(`/api/contacts/${id}`)
        if (res.ok) {
          const data = await res.json()
          setContact(data.contact || data)
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    }
    fetchContact()
  }, [id])

  const fetchNotes = useCallback(async () => {
    setIsLoadingNotes(true)
    try {
      const res = await fetch(`/api/contacts/${id}/notes`)
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes || [])
      }
    } catch {
      // silent
    } finally {
      setIsLoadingNotes(false)
    }
  }, [id])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleAddNote = async () => {
    if (!noteContent.trim() || !contact?.provider_id) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/contacts/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContent,
          note_type: noteType,
          is_private: notePrivate,
          provider_id: contact.provider_id,
        }),
      })
      if (res.ok) {
        setNoteContent('')
        setShowAddNote(false)
        fetchNotes()
      }
    } catch {
      // silent
    } finally {
      setIsSaving(false)
    }
  }

  const handleCallLogSuccess = () => {
    setShowCallLog(false)
    fetchNotes()
  }

  // Edit note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editNoteType, setEditNoteType] = useState<NoteType>('general')
  const [editPrivate, setEditPrivate] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const startEdit = (note: ContactNote) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
    setEditNoteType(note.note_type)
    setEditPrivate(note.is_private)
  }

  const cancelEdit = () => {
    setEditingNoteId(null)
    setEditContent('')
  }

  const handleEditNote = async (noteId: string) => {
    setIsEditing(true)
    try {
      const res = await fetch(`/api/contacts/${id}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          note_type: editNoteType,
          is_private: editPrivate,
        }),
      })
      if (res.ok) {
        setEditingNoteId(null)
        fetchNotes()
      }
    } catch {
      // silent
    } finally {
      setIsEditing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Contact not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{contact.display_name || 'Contact'}</h1>
        {contact.is_primary_contact && (
          <Badge variant="outline" className="text-xs">Primary</Badge>
        )}
        {contact.is_default_referral_handler && (
          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">Handler</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contact.display_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.display_email}`} className="hover:underline">
                  {contact.display_email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${phoneToTel(contact.phone)}`} className="hover:underline">{formatPhoneWithExt(contact.phone, contact.phone_extension)}</a>
              </div>
            )}
            {contact.job_title && (
              <div className="text-muted-foreground">Title: {contact.job_title}</div>
            )}
            <div className="flex gap-2 pt-2">
              <Badge variant={contact.provider_role === 'admin' ? 'default' : 'secondary'}>
                {contact.provider_role === 'admin' ? 'Admin' : 'User'}
              </Badge>
              <Badge
                variant="outline"
                className={
                  contact.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                  contact.status === 'invited' ? 'border-blue-200 text-blue-700' : ''
                }
              >
                {contact.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Organization Card */}
        {contact.provider && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="link"
                className="p-0 h-auto text-base"
                onClick={() => router.push(`/dashboard/providers/${contact.provider!.id}`)}
              >
                {contact.provider.name}
              </Button>
              {!contact.provider.is_active && (
                <Badge variant="secondary" className="ml-2 text-xs">Inactive</Badge>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Member since {new Date(contact.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes & Call Logs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes & Call Logs
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowCallLog(true); setShowAddNote(false) }}
              >
                <Phone className="h-4 w-4 mr-1" />
                Log Call
              </Button>
              <Button
                size="sm"
                onClick={() => { setShowAddNote(true); setShowCallLog(false) }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Note Form */}
          {showAddNote && (
            <div className="border rounded-md p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Switch id="note-private" checked={notePrivate} onCheckedChange={setNotePrivate} />
                  <Label htmlFor="note-private" className="text-xs flex items-center gap-1">
                    {notePrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {notePrivate ? 'Private' : 'Public'}
                  </Label>
                </div>
              </div>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write a note..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddNote(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddNote} disabled={!noteContent.trim() || isSaving}>
                  {isSaving ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </div>
          )}

          {/* Call Log Form */}
          {showCallLog && contact?.provider_id && (
            <CallLogForm
              providerId={contact.provider_id}
              contactId={id}
              onSuccess={handleCallLogSuccess}
              onCancel={() => setShowCallLog(false)}
            />
          )}

          {/* Notes List */}
          {isLoadingNotes ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notes yet. Add a note or log a call to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`border rounded-md p-3 space-y-2 ${note.is_private ? 'bg-amber-50 border-amber-200' : ''}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={noteTypeColors[note.note_type] || 'bg-gray-100 text-gray-800'}>
                      {note.note_type === 'call_log' ? 'Call Log' : note.note_type}
                    </Badge>
                    {note.is_private && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {note.user?.full_name || note.user?.email || 'System'} &middot;{' '}
                      {new Date(note.created_at).toLocaleString()}
                      {note.updated_at && note.updated_at !== note.created_at && (
                        <> &middot; edited {new Date(note.updated_at).toLocaleString()}</>
                      )}
                    </span>
                    {editingNoteId !== note.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => startEdit(note)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Select value={editNoteType} onValueChange={(v) => setEditNoteType(v as NoteType)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="outreach">Outreach</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="internal">Internal</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1.5">
                          <Switch id={`edit-private-${note.id}`} checked={editPrivate} onCheckedChange={setEditPrivate} />
                          <Label htmlFor={`edit-private-${note.id}`} className="text-xs">
                            {editPrivate ? 'Private' : 'Public'}
                          </Label>
                        </div>
                      </div>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isEditing}>
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleEditNote(note.id)} disabled={isEditing}>
                          <Check className="h-3 w-3 mr-1" />
                          {isEditing ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : note.note_type === 'call_log' && note.call_log_data ? (
                    <CallLogDisplay
                      callLogData={note.call_log_data}
                      content={note.content}
                      createdAt={note.created_at}
                    />
                  ) : (
                    <RichTextDisplay content={note.content} className="text-sm" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
