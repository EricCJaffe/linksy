'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Edit,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import type { HostCustomField } from '@/lib/types/linksy'

interface CustomFormBuilderProps {
  hostId: string
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
]

export function CustomFormBuilder({ hostId }: CustomFormBuilderProps) {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<HostCustomField | null>(null)
  const [formData, setFormData] = useState({
    field_label: '',
    field_type: 'text' as const,
    placeholder: '',
    help_text: '',
    is_required: false,
    field_options: [] as string[],
    optionsText: '',
  })

  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['host-custom-fields', hostId],
    queryFn: async () => {
      const res = await fetch(`/api/hosts/${hostId}/custom-fields?include_inactive=true`)
      if (!res.ok) throw new Error('Failed to fetch custom fields')
      const json = await res.json()
      return json.fields as HostCustomField[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/hosts/${hostId}/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create field')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-custom-fields', hostId] })
      resetForm()
      setIsDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ fieldId, data }: { fieldId: string; data: any }) => {
      const res = await fetch(`/api/hosts/${hostId}/custom-fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update field')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-custom-fields', hostId] })
      resetForm()
      setIsDialogOpen(false)
      setEditingField(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const res = await fetch(`/api/hosts/${hostId}/custom-fields/${fieldId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete field')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-custom-fields', hostId] })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ fieldId, isActive }: { fieldId: string; isActive: boolean }) => {
      const res = await fetch(`/api/hosts/${hostId}/custom-fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!res.ok) throw new Error('Failed to toggle field visibility')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-custom-fields', hostId] })
    },
  })

  const resetForm = () => {
    setFormData({
      field_label: '',
      field_type: 'text',
      placeholder: '',
      help_text: '',
      is_required: false,
      field_options: [],
      optionsText: '',
    })
    setEditingField(null)
  }

  const handleOpenDialog = (field?: HostCustomField) => {
    if (field) {
      setEditingField(field)
      setFormData({
        field_label: field.field_label,
        field_type: field.field_type as any,
        placeholder: field.placeholder || '',
        help_text: field.help_text || '',
        is_required: field.is_required,
        field_options: field.field_options || [],
        optionsText: (field.field_options || []).join('\n'),
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    const needsOptions = formData.field_type === 'select'
    const options = needsOptions
      ? formData.optionsText.split('\n').filter((line) => line.trim())
      : []

    if (needsOptions && options.length === 0) {
      return
    }

    const data = {
      field_label: formData.field_label,
      field_type: formData.field_type,
      placeholder: formData.placeholder || undefined,
      help_text: formData.help_text || undefined,
      is_required: formData.is_required,
      field_options: options,
      sort_order: editingField?.sort_order ?? (fieldsData?.length || 0),
    }

    if (editingField) {
      updateMutation.mutate({ fieldId: editingField.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleToggleActive = (fieldId: string, currentActive: boolean) => {
    toggleActiveMutation.mutate({ fieldId, isActive: !currentActive })
  }

  const activeFields = fieldsData?.filter((f) => f.is_active) || []
  const inactiveFields = fieldsData?.filter((f) => !f.is_active) || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Intake Form Fields</CardTitle>
            <CardDescription>
              Add custom fields to your referral intake form. Fields are shown to users when they
              submit a referral.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingField ? 'Edit Field' : 'Add Custom Field'}</DialogTitle>
                <DialogDescription>
                  Create a custom field for your referral intake form.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="field_label">Field Label *</Label>
                  <Input
                    id="field_label"
                    value={formData.field_label}
                    onChange={(e) =>
                      setFormData({ ...formData, field_label: e.target.value })
                    }
                    placeholder="e.g., Insurance Provider"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field_type">Field Type *</Label>
                  <Select
                    value={formData.field_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, field_type: value })
                    }
                  >
                    <SelectTrigger id="field_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.field_type === 'select' && (
                  <div className="space-y-2">
                    <Label htmlFor="options">Options (one per line) *</Label>
                    <Textarea
                      id="options"
                      value={formData.optionsText}
                      onChange={(e) =>
                        setFormData({ ...formData, optionsText: e.target.value })
                      }
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      rows={4}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="placeholder">Placeholder Text</Label>
                  <Input
                    id="placeholder"
                    value={formData.placeholder}
                    onChange={(e) =>
                      setFormData({ ...formData, placeholder: e.target.value })
                    }
                    placeholder="Optional placeholder text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help_text">Help Text</Label>
                  <Textarea
                    id="help_text"
                    value={formData.help_text}
                    onChange={(e) =>
                      setFormData({ ...formData, help_text: e.target.value })
                    }
                    placeholder="Optional help text shown below the field"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_required: checked })
                    }
                  />
                  <Label htmlFor="is_required" className="cursor-pointer">
                    Required field
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    !formData.field_label ||
                    (formData.field_type === 'select' &&
                      formData.optionsText.split('\n').filter((l) => l.trim()).length === 0)
                  }
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingField ? 'Update' : 'Create'} Field
                </Button>
              </DialogFooter>

              {(createMutation.isError || updateMutation.isError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(createMutation.error || updateMutation.error) instanceof Error
                      ? (createMutation.error || updateMutation.error)?.message
                      : 'Failed to save field'}
                  </AlertDescription>
                </Alert>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeFields.length === 0 && inactiveFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No custom fields yet. Click "Add Field" to create one.</p>
              </div>
            ) : (
              <>
                {activeFields.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h3 className="text-sm font-medium">Active Fields</h3>
                    {activeFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.field_label}</span>
                            <Badge variant="outline" className="text-xs">
                              {FIELD_TYPES.find((t) => t.value === field.field_type)?.label}
                            </Badge>
                            {field.is_required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          {field.help_text && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {field.help_text}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(field)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(field.id, field.is_active)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(field.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {inactiveFields.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Hidden Fields
                    </h3>
                    {inactiveFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground">
                              {field.field_label}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {FIELD_TYPES.find((t) => t.value === field.field_type)?.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(field)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(field.id, field.is_active)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(field.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
