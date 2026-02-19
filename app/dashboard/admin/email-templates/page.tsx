'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Mail, Pencil, X, Save } from 'lucide-react'
import type { EmailTemplate } from '@/lib/types/linksy'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', subject: '', body_html: '', is_active: true })

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
    setEditingId(template.id)
    setEditForm({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      is_active: template.is_active,
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    try {
      const res = await fetch(`/api/admin/email-templates/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditingId(null)
        fetchTemplates()
      }
    } catch (err) {
      console.error('Failed to save template:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground">Manage notification email templates</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading templates...</p>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground">No email templates found.</p>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{template.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={template.is_active ? 'default' : 'outline'}>
                      {template.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                    {editingId === template.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing(template)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingId === template.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Template Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Subject Line</Label>
                      <Input
                        value={editForm.subject}
                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Body HTML</Label>
                      <Textarea
                        value={editForm.body_html}
                        onChange={(e) => setEditForm({ ...editForm, body_html: e.target.value })}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editForm.is_active}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Available Variables</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(template.variables || []).map((v: string) => (
                          <Badge key={v} variant="outline" className="font-mono text-xs">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject: </span>
                      <span>{template.subject}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Variables: </span>
                      {(template.variables || []).map((v: string) => (
                        <Badge key={v} variant="outline" className="font-mono text-xs mr-1">
                          {v}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(template.updated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
