'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Trash2, RotateCcw, AlertCircle, Check } from 'lucide-react'
import type { HostEmailTemplate } from '@/lib/types/linksy'

interface EmailTemplateEditorProps {
  hostId: string
}

const TEMPLATE_KEYS = [
  {
    key: 'ticket_new_assignment',
    name: 'New Ticket Assignment',
    description: 'Sent to the default referral handler when a new ticket is created',
    variables: [
      'app_name',
      'contact_name',
      'ticket_number',
      'client_name',
      'need_name',
      'description',
      'provider_name',
      'ticket_url',
      'custom_fields',
    ],
  },
  {
    key: 'ticket_status_update',
    name: 'Ticket Status Update',
    description: 'Sent to the client when their ticket status changes',
    variables: [
      'app_name',
      'client_name',
      'ticket_number',
      'status_label',
      'provider_name',
      'need_name',
    ],
  },
]

export function EmailTemplateEditor({ hostId }: EmailTemplateEditorProps) {
  const queryClient = useQueryClient()
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: '',
  })
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['host-email-templates', hostId],
    queryFn: async () => {
      const res = await fetch(`/api/hosts/${hostId}/email-templates`)
      if (!res.ok) throw new Error('Failed to fetch templates')
      const json = await res.json()
      return json.templates as HostEmailTemplate[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: {
      template_key: string
      name: string
      subject: string
      body_html: string
      variables: string[]
    }) => {
      const res = await fetch(`/api/hosts/${hostId}/email-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save template')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-email-templates', hostId] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/hosts/${hostId}/email-templates/${templateId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete template')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-email-templates', hostId] })
      setSelectedTemplateKey(null)
      setFormData({ name: '', subject: '', body_html: '' })
    },
  })

  const handleSelectTemplate = (templateKey: string) => {
    setSelectedTemplateKey(templateKey)
    setSaveSuccess(false)

    const existing = templatesData?.find((t) => t.template_key === templateKey)
    const templateDef = TEMPLATE_KEYS.find((t) => t.key === templateKey)

    if (existing) {
      setFormData({
        name: existing.name,
        subject: existing.subject,
        body_html: existing.body_html,
      })
    } else if (templateDef) {
      setFormData({
        name: templateDef.name,
        subject: '',
        body_html: '',
      })
    }
  }

  const handleSave = () => {
    if (!selectedTemplateKey) return

    const templateDef = TEMPLATE_KEYS.find((t) => t.key === selectedTemplateKey)
    if (!templateDef) return

    saveMutation.mutate({
      template_key: selectedTemplateKey,
      name: formData.name,
      subject: formData.subject,
      body_html: formData.body_html,
      variables: templateDef.variables,
    })
  }

  const handleResetToDefault = () => {
    const existing = templatesData?.find((t) => t.template_key === selectedTemplateKey)
    if (existing) {
      deleteMutation.mutate(existing.id)
    }
  }

  const selectedTemplate = TEMPLATE_KEYS.find((t) => t.key === selectedTemplateKey)
  const existingTemplate = templatesData?.find((t) => t.template_key === selectedTemplateKey)
  const isCustomized = !!existingTemplate

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Template Customization</CardTitle>
        <CardDescription>
          Customize email templates sent to users. Use variables like{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{variable_name}}'}</code> to
          insert dynamic content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={selectedTemplateKey || ''} onValueChange={handleSelectTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an email template to customize" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_KEYS.map((template) => {
                    const isCustomized = templatesData?.some(
                      (t) => t.template_key === template.key
                    )
                    return (
                      <SelectItem key={template.key} value={template.key}>
                        <div className="flex items-center gap-2">
                          {template.name}
                          {isCustomized && (
                            <Badge variant="secondary" className="ml-2">
                              Customized
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{selectedTemplate.description}</AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="font-mono text-xs">
                        {'{{' + variable + '}}'}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., New Ticket Assignment"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Use variables like {{ticket_number}} and {{provider_name}}"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Email Body (HTML)</Label>
                  <Textarea
                    id="body"
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    placeholder="Enter your HTML email template. Use variables like {{contact_name}}"
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports full HTML. Use inline CSS for styling.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={
                      saveMutation.isPending ||
                      !formData.subject ||
                      !formData.body_html ||
                      !formData.name
                    }
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {saveSuccess ? 'Saved!' : 'Save Template'}
                  </Button>

                  {isCustomized && (
                    <Button
                      variant="outline"
                      onClick={handleResetToDefault}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Reset to Default
                    </Button>
                  )}
                </div>

                {saveMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {saveMutation.error instanceof Error
                        ? saveMutation.error.message
                        : 'Failed to save template'}
                    </AlertDescription>
                  </Alert>
                )}

                {deleteMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {deleteMutation.error instanceof Error
                        ? deleteMutation.error.message
                        : 'Failed to reset template'}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
