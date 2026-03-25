'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Mail,
  Pencil,
  X,
  Save,
  Plus,
  Eye,
  SendHorizonal,
  Loader2,
  Trash2,
  Zap,
  ChevronDown,
  Info,
} from 'lucide-react'
import type { EmailTemplate } from '@/lib/types/linksy'
import { RichTextEditor, type RichTextEditorApi } from '@/components/ui/rich-text-editor'
import { EMAIL_TEMPLATE_DEFINITIONS, type EmailTemplateDefinition } from '@/lib/email/template-registry'
import DOMPurify from 'isomorphic-dompurify'

// All available variables grouped by category for the insert dropdown
const VARIABLE_GROUPS: { label: string; variables: { name: string; desc: string }[] }[] = [
  {
    label: 'Common',
    variables: [
      { name: 'app_name', desc: 'Application name (e.g. Linksy)' },
      { name: 'app_url', desc: 'Application base URL' },
      { name: 'to', desc: 'Recipient email address' },
      { name: 'dashboard_url', desc: 'Link to admin dashboard' },
      { name: 'support_email', desc: 'Platform support email' },
    ],
  },
  {
    label: 'Client / Person',
    variables: [
      { name: 'client_name', desc: 'Client name' },
      { name: 'contact_name', desc: 'Provider contact name' },
      { name: 'assignee_name', desc: 'Person being assigned' },
      { name: 'assigner_name', desc: 'Person who assigned' },
      { name: 'reassigner_name', desc: 'Admin who reassigned' },
      { name: 'forwarder_name', desc: 'Person who forwarded' },
      { name: 'inviter_name', desc: 'Person sending invite' },
    ],
  },
  {
    label: 'Provider / Organization',
    variables: [
      { name: 'provider_name', desc: 'Provider organization name' },
      { name: 'new_provider_name', desc: 'New provider (when transferred)' },
      { name: 'tenant_name', desc: 'Tenant / region name' },
      { name: 'role', desc: 'Role being assigned' },
    ],
  },
  {
    label: 'Referral / Ticket',
    variables: [
      { name: 'ticket_number', desc: 'Referral number (e.g. R-2001-07)' },
      { name: 'ticket_url', desc: 'Link to view the referral' },
      { name: 'need_name', desc: 'Service / need category' },
      { name: 'description', desc: 'Description of client need' },
      { name: 'custom_fields', desc: 'Custom intake form responses' },
      { name: 'status_label', desc: 'Status label (e.g. "In Process")' },
      { name: 'new_status', desc: 'New status machine name' },
      { name: 'reason', desc: 'Reason for forwarding / reassignment' },
      { name: 'notes', desc: 'Notes from the action' },
    ],
  },
  {
    label: 'SLA / Alerts',
    variables: [
      { name: 'total_count', desc: 'Total stale referrals' },
      { name: 'threshold_hours', desc: 'SLA threshold (hours)' },
      { name: 'threshold_days', desc: 'SLA threshold (days)' },
      { name: 'hours_pending', desc: 'Hours referral has been pending' },
      { name: 'days_pending', desc: 'Days referral has been pending' },
      { name: 'sla_hours', desc: 'Provider SLA threshold hours' },
      { name: 'age_breakdown', desc: 'Stale referral age breakdown' },
      { name: 'ticket_table', desc: 'HTML table of stale referrals' },
    ],
  },
  {
    label: 'Support / AI Triage',
    variables: [
      { name: 'subject', desc: 'Support ticket subject' },
      { name: 'severity', desc: 'AI triage severity' },
      { name: 'classification', desc: 'AI triage classification' },
      { name: 'root_cause', desc: 'AI root cause hypothesis' },
      { name: 'suggested_fix', desc: 'AI suggested fix' },
      { name: 'remediation_prompt', desc: 'AI coding prompt' },
    ],
  },
  {
    label: 'Invitation',
    variables: [
      { name: 'invite_url', desc: 'Invitation accept link' },
    ],
  },
  {
    label: 'Description Review',
    variables: [
      { name: 'current_description', desc: 'Current provider description' },
      { name: 'ai_suggested_description', desc: 'AI-suggested description' },
      { name: 'accept_current_url', desc: 'Accept current link' },
      { name: 'accept_ai_url', desc: 'Accept AI suggestion link' },
      { name: 'edit_url', desc: 'Manual edit link' },
    ],
  },
]

// Flat list of all variable names for quick lookup
const ALL_VARIABLE_NAMES = VARIABLE_GROUPS.flatMap((g) => g.variables.map((v) => v.name))

type EditMode = 'none' | 'edit' | 'create'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    template_key: '',
    name: '',
    subject: '',
    body_html: '',
    variables: [] as string[],
    is_active: true,
    trigger_event: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [testEmailTo, setTestEmailTo] = useState('')
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmailTemplate, setTestEmailTemplate] = useState<EmailTemplate | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const editorApiRef = useRef<RichTextEditorApi | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/email-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const startEditing = (template: EmailTemplate) => {
    setEditMode('edit')
    setEditingId(template.id)
    setEditForm({
      template_key: template.template_key,
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      variables: template.variables || [],
      is_active: template.is_active,
      trigger_event: template.trigger_event || '',
    })
    setSaveMessage(null)
  }

  const startCreating = () => {
    setEditMode('create')
    setEditingId(null)
    setEditForm({
      template_key: '',
      name: '',
      subject: '',
      body_html: '<p>Enter your email template content here.</p>',
      variables: ALL_VARIABLE_NAMES,
      is_active: true,
      trigger_event: '',
    })
    setSaveMessage(null)
  }

  const cancelEdit = () => {
    setEditMode('none')
    setEditingId(null)
    setSaveMessage(null)
  }

  const insertVariable = useCallback(
    (variable: string) => {
      const token = `{{${variable}}}`
      if (editorApiRef.current) {
        editorApiRef.current.insertText(token)
        return
      }
      setEditForm((prev) => ({
        ...prev,
        body_html: `${prev.body_html}${prev.body_html ? ' ' : ''}${token}`,
      }))
    },
    []
  )

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      if (editMode === 'create') {
        const template_key = editForm.template_key || generateSlug(editForm.name)
        const res = await fetch('/api/admin/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_key,
            name: editForm.name,
            subject: editForm.subject,
            body_html: editForm.body_html,
            variables: editForm.variables,
            trigger_event: editForm.trigger_event || null,
          }),
        })
        if (res.ok) {
          setSaveMessage({ type: 'success', text: 'Template created successfully!' })
          setEditMode('none')
          fetchTemplates()
        } else {
          const data = await res.json()
          setSaveMessage({ type: 'error', text: data.error || 'Failed to create template' })
        }
      } else if (editingId) {
        const res = await fetch(`/api/admin/email-templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editForm.name,
            subject: editForm.subject,
            body_html: editForm.body_html,
            is_active: editForm.is_active,
            variables: editForm.variables,
            trigger_event: editForm.trigger_event || null,
          }),
        })
        if (res.ok) {
          setSaveMessage({ type: 'success', text: 'Template saved!' })
          setEditMode('none')
          setEditingId(null)
          fetchTemplates()
        } else {
          const data = await res.json()
          setSaveMessage({ type: 'error', text: data.error || 'Failed to save template' })
        }
      }
    } catch (err) {
      console.error('Failed to save template:', err)
      setSaveMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirmId(null)
        fetchTemplates()
      }
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  const openPreview = (template: EmailTemplate) => {
    // Render with sample data
    const sampleVars: Record<string, string> = {
      app_name: 'Linksy',
      contact_name: 'Jane Smith',
      client_name: 'John Doe',
      provider_name: 'Sample Provider',
      need_name: 'Rental Assistance',
      ticket_number: 'R-2001-07',
      ticket_url: '#',
      status_label: 'In Process',
      description: 'Sample description of need.',
      inviter_name: 'Admin',
      tenant_name: 'Clay County',
      role: 'member',
      invite_url: '#',
      total_count: '5',
      threshold_hours: '48',
      severity: 'HIGH',
      classification: 'bug',
    }
    const render = (text: string) =>
      text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => sampleVars[key] ?? `{{${key}}}`)

    setPreviewSubject(render(template.subject))
    setPreviewHtml(render(template.body_html))
    setPreviewOpen(true)
  }

  const openPreviewForEdit = () => {
    const sampleVars: Record<string, string> = {
      app_name: 'Linksy',
      contact_name: 'Jane Smith',
      client_name: 'John Doe',
      provider_name: 'Sample Provider',
      need_name: 'Rental Assistance',
      ticket_number: 'R-2001-07',
      ticket_url: '#',
      status_label: 'In Process',
      description: 'Sample description of need.',
      inviter_name: 'Admin',
      tenant_name: 'Clay County',
      role: 'member',
      invite_url: '#',
      total_count: '5',
      threshold_hours: '48',
      severity: 'HIGH',
      classification: 'bug',
    }
    const render = (text: string) =>
      text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => sampleVars[key] ?? `{{${key}}}`)

    setPreviewSubject(render(editForm.subject))
    setPreviewHtml(render(editForm.body_html))
    setPreviewOpen(true)
  }

  const openTestEmail = (template: EmailTemplate) => {
    setTestEmailTemplate(template)
    setTestEmailTo('')
    setTestEmailOpen(true)
  }

  const sendTestEmail = async () => {
    if (!testEmailTemplate || !testEmailTo) return
    setTestEmailLoading(true)
    try {
      const res = await fetch('/api/admin/email-templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailTo,
          subject: testEmailTemplate.subject,
          body_html: testEmailTemplate.body_html,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Test email sent to ${testEmailTo}`)
        setTestEmailOpen(false)
      } else {
        alert(`Failed to send: ${data.error}`)
      }
    } catch {
      alert('Network error sending test email')
    } finally {
      setTestEmailLoading(false)
    }
  }

  // Find the registry definition for a template (if it's a system template)
  const getRegistryDef = (key: string): EmailTemplateDefinition | undefined => {
    return EMAIL_TEMPLATE_DEFINITIONS.find((d) => d.key === key)
  }

  const isSystemTemplate = (key: string) => {
    return EMAIL_TEMPLATE_DEFINITIONS.some((d) => d.key === key)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage notification email templates. Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{variable_name}}'}</code> for dynamic content.
          </p>
        </div>
        <Button onClick={startCreating} disabled={editMode !== 'none'}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Global save message */}
      {saveMessage && (
        <div
          className={cn(
            'px-4 py-3 rounded-lg text-sm',
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          )}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Create new template form */}
      {editMode === 'create' && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Create New Email Template</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openPreviewForEdit}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !editForm.name || !editForm.subject}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Create
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TemplateEditForm
              form={editForm}
              setForm={setEditForm}
              editorApiRef={editorApiRef}
              insertVariable={insertVariable}
            />
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading templates...
        </div>
      ) : templates.length === 0 && editMode !== 'create' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No email templates found.</p>
            <Button onClick={startCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => {
            const registryDef = getRegistryDef(template.template_key)
            const isEditing = editMode === 'edit' && editingId === template.id
            const isSystem = isSystemTemplate(template.template_key)

            return (
              <Card
                key={template.id}
                className={cn(isEditing && 'border-2 border-primary/20')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">{template.template_key}</span>
                          {template.trigger_event && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Zap className="h-3 w-3" />
                              {template.trigger_event}
                            </Badge>
                          )}
                        </div>
                        {(template.description || registryDef?.description) && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description || registryDef?.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={template.is_active ? 'default' : 'outline'}>
                        {template.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={openPreviewForEdit}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPreview(template)}
                            title="Preview template"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTestEmail(template)}
                            title="Send test email"
                          >
                            <SendHorizonal className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(template)}
                            disabled={editMode !== 'none'}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          {!isSystem && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(template.id)}
                              disabled={editMode !== 'none'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <TemplateEditForm
                      form={editForm}
                      setForm={setEditForm}
                      editorApiRef={editorApiRef}
                      insertVariable={insertVariable}
                    />
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subject: </span>
                        <span className="font-mono text-xs">{template.subject}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-muted-foreground">Variables: </span>
                        {(template.variables || []).length === 0 ? (
                          <span className="text-muted-foreground italic text-xs">None configured</span>
                        ) : (
                          (template.variables || []).map((v: string) => (
                            <Badge key={v} variant="outline" className="font-mono text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))
                        )}
                      </div>
                      {!template.trigger_event && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600">
                          <Info className="h-3 w-3" />
                          Not connected to a trigger event yet
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Last updated: {new Date(template.updated_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data. Variables that don&apos;t have sample values will show as {'{{'}<em>variable</em>{'}}'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Subject</Label>
              <p className="font-medium">{previewSubject}</p>
            </div>
            <div className="border rounded-lg p-4 bg-white">
              <div
                className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(previewHtml, { USE_PROFILES: { html: true } }),
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email using &quot;{testEmailTemplate?.name}&quot; with sample data filled in for all variables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && testEmailTo) sendTestEmail()
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={sendTestEmail}
                disabled={testEmailLoading || !testEmailTo}
              >
                {testEmailLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4 mr-2" />
                )}
                Send Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Template Edit Form ─────────────────────────────────────────────────────

interface TemplateEditFormProps {
  form: {
    template_key: string
    name: string
    subject: string
    body_html: string
    variables: string[]
    is_active: boolean
    trigger_event: string
  }
  setForm: React.Dispatch<React.SetStateAction<TemplateEditFormProps['form']>>
  editorApiRef: React.MutableRefObject<RichTextEditorApi | null>
  insertVariable: (variable: string) => void
}

function TemplateEditForm({
  form,
  setForm,
  editorApiRef,
  insertVariable,
}: TemplateEditFormProps) {
  const [varDropdownOpen, setVarDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!varDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVarDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [varDropdownOpen])

  const handleInsertVar = (varName: string) => {
    insertVariable(varName)
    setVarDropdownOpen(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Template Name <span className="text-destructive">*</span></Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Welcome Email"
        />
      </div>
      <div>
        <Label>Subject Line <span className="text-destructive">*</span></Label>
        <Input
          value={form.subject}
          onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
          placeholder="e.g. Your referral {{ticket_number}} has been updated"
          className="font-mono text-sm"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Email Body</Label>
          {/* Insert Variable dropdown — sits above the editor toolbar */}
          <div className="relative" ref={dropdownRef}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => setVarDropdownOpen(!varDropdownOpen)}
            >
              <Plus className="h-3 w-3" />
              Insert Variable
              <ChevronDown className={cn('h-3 w-3 transition-transform', varDropdownOpen && 'rotate-180')} />
            </Button>
            {varDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                {VARIABLE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="sticky top-0 bg-muted/80 backdrop-blur px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b">
                      {group.label}
                    </div>
                    {group.variables.map((v) => (
                      <button
                        key={v.name}
                        type="button"
                        className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        onClick={() => handleInsertVar(v.name)}
                      >
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono shrink-0">
                          {`{{${v.name}}}`}
                        </code>
                        <span className="text-xs text-muted-foreground truncate">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <RichTextEditor
          value={form.body_html}
          onChange={(html) => setForm((prev) => ({ ...prev, body_html: html }))}
          onReady={(api) => {
            editorApiRef.current = api
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use the <strong>Insert Variable</strong> button to add dynamic fields like names, ticket numbers, and links.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
          />
          <Label>Active</Label>
        </div>
        <div>
          <Label className="flex items-center gap-1.5">
            Trigger Event
            <Badge variant="outline" className="text-xs font-normal">Coming Soon</Badge>
          </Label>
          <Input
            value={form.trigger_event}
            onChange={(e) => setForm((prev) => ({ ...prev, trigger_event: e.target.value }))}
            placeholder="e.g. ticket.created"
            className="font-mono text-sm"
            disabled
          />
          <p className="text-xs text-muted-foreground mt-1">
            The system event that will send this template. Will be configurable before go-live.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
