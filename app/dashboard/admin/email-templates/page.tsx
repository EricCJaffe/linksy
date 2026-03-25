'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
  Copy,
  Check,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import type { EmailTemplate } from '@/lib/types/linksy'
import { RichTextEditor, type RichTextEditorApi } from '@/components/ui/rich-text-editor'
import { EMAIL_TEMPLATE_DEFINITIONS, type EmailTemplateDefinition } from '@/lib/email/template-registry'
import DOMPurify from 'isomorphic-dompurify'

// Variable descriptions for the reference panel
const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  app_name: 'Application name (e.g. Linksy)',
  app_url: 'Application base URL',
  to: 'Recipient email address',
  email: 'Recipient email address',
  contact_name: 'Name of the provider contact receiving this email',
  client_name: 'Name of the client/referral subject',
  provider_name: 'Name of the provider organization',
  need_name: 'Name of the service/need category',
  ticket_number: 'Referral ticket number (e.g. R-2001-07)',
  ticket_url: 'Direct link to view the referral ticket',
  description: 'Description of the client\'s need',
  custom_fields: 'HTML table of custom intake form field responses',
  status_label: 'Human-readable status label (e.g. "In Process")',
  new_status: 'New status value (machine name)',
  new_provider_name: 'Name of the new provider (when transferred)',
  forwarder_name: 'Name of the person who forwarded the referral',
  reason: 'Reason for forwarding/reassignment',
  notes: 'Additional notes from the forwarding/assignment action',
  assignee_name: 'Name of the person being assigned the referral',
  reassigner_name: 'Name of the admin who reassigned the referral',
  assigner_name: 'Name of the person who assigned internally',
  inviter_name: 'Name of the person sending the invitation',
  tenant_name: 'Name of the tenant/organization',
  role: 'Role being assigned (admin, member)',
  invite_url: 'Link to accept the invitation',
  total_count: 'Total number of stale referrals',
  threshold_hours: 'SLA threshold in hours',
  threshold_days: 'SLA threshold in days',
  age_breakdown: 'HTML breakdown of referral ages',
  ticket_table: 'HTML table of stale referral details',
  dashboard_url: 'Link to the admin dashboard',
  hours_pending: 'Number of hours the referral has been pending',
  days_pending: 'Number of days the referral has been pending',
  sla_hours: 'SLA threshold hours for the provider',
  severity: 'AI triage severity level (low/medium/high/critical)',
  classification: 'AI triage classification (bug/feature_request/etc)',
  root_cause: 'AI triage root cause hypothesis',
  suggested_fix: 'AI triage suggested fix approach',
  remediation_prompt: 'AI-generated prompt for coding assistant',
  support_email: 'Platform support email address',
  current_description: 'Provider\'s current description text',
  ai_suggested_description: 'AI-suggested description from website scan',
  accept_current_url: 'Link to accept current description',
  accept_ai_url: 'Link to accept AI-suggested description',
  edit_url: 'Link to manually edit description',
  subject: 'Support ticket subject line',
  // Legacy camelCase variables
  contactName: 'Name of the provider contact (legacy)',
  clientName: 'Name of the client (legacy)',
  providerName: 'Provider organization name (legacy)',
  needName: 'Service/need category name (legacy)',
  ticketNumber: 'Referral ticket number (legacy)',
  ticketUrl: 'Link to view the referral (legacy)',
  statusLabel: 'Human-readable status (legacy)',
  newStatus: 'New status machine name (legacy)',
  inviterName: 'Name of inviter (legacy)',
  tenantName: 'Tenant/organization name (legacy)',
  inviteUrl: 'Invitation accept link (legacy)',
}

type EditMode = 'none' | 'edit' | 'create'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    slug: '',
    name: '',
    description: '',
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
  const [expandedVars, setExpandedVars] = useState(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
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
      slug: template.slug,
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      body_html: template.body_html,
      variables: template.variables || [],
      is_active: template.is_active,
      trigger_event: template.trigger_event || '',
    })
    setExpandedVars(false)
    setSaveMessage(null)
  }

  const startCreating = () => {
    setEditMode('create')
    setEditingId(null)
    setEditForm({
      slug: '',
      name: '',
      description: '',
      subject: '',
      body_html: '<p>Enter your email template content here.</p>',
      variables: [],
      is_active: true,
      trigger_event: '',
    })
    setExpandedVars(false)
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

  const insertVariableIntoSubject = (variable: string) => {
    setEditForm((prev) => ({
      ...prev,
      subject: `${prev.subject}{{${variable}}}`,
    }))
  }

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`)
    setCopiedVar(variable)
    setTimeout(() => setCopiedVar(null), 1500)
  }

  const handleAddVariable = () => {
    const name = prompt('Enter variable name (letters, numbers, underscores only):')
    if (!name) return
    const clean = name.trim().replace(/[^a-zA-Z0-9_]/g, '')
    if (!clean) return
    if (editForm.variables.includes(clean)) return
    setEditForm((prev) => ({
      ...prev,
      variables: [...prev.variables, clean],
    }))
  }

  const handleRemoveVariable = (variable: string) => {
    setEditForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== variable),
    }))
  }

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
        const slug = editForm.slug || generateSlug(editForm.name)
        const res = await fetch('/api/admin/email-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            name: editForm.name,
            description: editForm.description || null,
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
            description: editForm.description || null,
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
  const getRegistryDef = (slug: string): EmailTemplateDefinition | undefined => {
    return EMAIL_TEMPLATE_DEFINITIONS.find((d) => d.key === slug)
  }

  // Get all available variables for the current edit form
  const getAvailableVariables = (): string[] => {
    if (editForm.variables.length > 0) return editForm.variables
    const def = getRegistryDef(editForm.slug)
    return def?.placeholders || []
  }

  const isSystemTemplate = (slug: string) => {
    return EMAIL_TEMPLATE_DEFINITIONS.some((d) => d.key === slug)
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
              insertVariableIntoSubject={insertVariableIntoSubject}
              copyVariable={copyVariable}
              copiedVar={copiedVar}
              availableVariables={getAvailableVariables()}
              onAddVariable={handleAddVariable}
              onRemoveVariable={handleRemoveVariable}
              expandedVars={expandedVars}
              setExpandedVars={setExpandedVars}
              showSlug
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
            const registryDef = getRegistryDef(template.slug)
            const isEditing = editMode === 'edit' && editingId === template.id
            const isSystem = isSystemTemplate(template.slug)

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
                          <span className="text-xs text-muted-foreground font-mono">{template.slug}</span>
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
                      insertVariableIntoSubject={insertVariableIntoSubject}
                      copyVariable={copyVariable}
                      copiedVar={copiedVar}
                      availableVariables={getAvailableVariables()}
                      onAddVariable={handleAddVariable}
                      onRemoveVariable={handleRemoveVariable}
                      expandedVars={expandedVars}
                      setExpandedVars={setExpandedVars}
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
    slug: string
    name: string
    description: string
    subject: string
    body_html: string
    variables: string[]
    is_active: boolean
    trigger_event: string
  }
  setForm: React.Dispatch<React.SetStateAction<TemplateEditFormProps['form']>>
  editorApiRef: React.MutableRefObject<RichTextEditorApi | null>
  insertVariable: (variable: string) => void
  insertVariableIntoSubject: (variable: string) => void
  copyVariable: (variable: string) => void
  copiedVar: string | null
  availableVariables: string[]
  onAddVariable: () => void
  onRemoveVariable: (variable: string) => void
  expandedVars: boolean
  setExpandedVars: (v: boolean) => void
  showSlug?: boolean
}

function TemplateEditForm({
  form,
  setForm,
  editorApiRef,
  insertVariable,
  insertVariableIntoSubject,
  copyVariable,
  copiedVar,
  availableVariables,
  onAddVariable,
  onRemoveVariable,
  expandedVars,
  setExpandedVars,
  showSlug,
}: TemplateEditFormProps) {
  return (
    <div className="space-y-4">
      {showSlug && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Template Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Welcome Email"
            />
          </div>
          <div>
            <Label>Slug (auto-generated if blank)</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="e.g. welcome_email"
              className="font-mono text-sm"
            />
          </div>
        </div>
      )}
      {!showSlug && (
        <div>
          <Label>Template Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
      )}
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of when this template is used..."
          rows={2}
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
        <p className="text-xs text-muted-foreground mt-1">
          Click a variable below to insert it into the subject line or email body.
        </p>
      </div>
      <div>
        <Label>Email Body</Label>
        <RichTextEditor
          value={form.body_html}
          onChange={(html) => setForm((prev) => ({ ...prev, body_html: html }))}
          onReady={(api) => {
            editorApiRef.current = api
          }}
        />
      </div>

      {/* Variable reference panel */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-semibold flex items-center gap-2">
            Available Variables
            <Badge variant="secondary" className="text-xs">{availableVariables.length}</Badge>
          </Label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onAddVariable}>
              <Plus className="h-3 w-3 mr-1" />
              Add Variable
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpandedVars(!expandedVars)}
            >
              {expandedVars ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Compact variable buttons (always visible) */}
        <div className="flex flex-wrap gap-1.5">
          {availableVariables.map((v) => (
            <div key={v} className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => insertVariable(v)}
                className="inline-flex items-center rounded-l-full border border-r-0 px-2.5 py-1 font-mono text-xs hover:bg-accent transition-colors"
                title={`Click to insert {{${v}}} into email body`}
              >
                {`{{${v}}}`}
              </button>
              <button
                type="button"
                onClick={() => insertVariableIntoSubject(v)}
                className="inline-flex items-center border border-r-0 px-1.5 py-1 text-xs hover:bg-accent transition-colors text-muted-foreground"
                title={`Insert into subject line`}
              >
                S
              </button>
              <button
                type="button"
                onClick={() => copyVariable(v)}
                className="inline-flex items-center rounded-r-full border px-1.5 py-1 text-xs hover:bg-accent transition-colors text-muted-foreground"
                title="Copy to clipboard"
              >
                {copiedVar === v ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Expanded variable descriptions */}
        {expandedVars && (
          <div className="mt-3 border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Variable Reference</p>
            <div className="grid gap-1">
              {availableVariables.map((v) => (
                <div key={v} className="flex items-start gap-3 text-xs py-1">
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{`{{${v}}}`}</code>
                  <span className="text-muted-foreground">
                    {VARIABLE_DESCRIPTIONS[v] || 'Custom variable'}
                  </span>
                  {!VARIABLE_DESCRIPTIONS[v] && (
                    <button
                      type="button"
                      onClick={() => onRemoveVariable(v)}
                      className="ml-auto text-destructive hover:text-destructive/80"
                      title="Remove this variable"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
