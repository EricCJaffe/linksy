'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Phone, X } from 'lucide-react'
import type { CallOutcome, CallLogData } from '@/lib/types/linksy'

interface CallLogFormProps {
  providerId: string
  onSuccess: () => void
  onCancel: () => void
}

const callOutcomes: { value: CallOutcome; label: string }[] = [
  { value: 'answered', label: 'Answered' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'wrong_number', label: 'Wrong Number' },
]

export function CallLogForm({ providerId, onSuccess, onCancel }: CallLogFormProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<{
    content: string
    call_outcome: CallOutcome | ''
    duration_minutes: string
    caller_name: string
    caller_phone: string
    caller_email: string
    follow_up_required: boolean
    follow_up_date: string
    is_private: boolean
  }>({
    content: '',
    call_outcome: '',
    duration_minutes: '',
    caller_name: '',
    caller_phone: '',
    caller_email: '',
    follow_up_required: false,
    follow_up_date: '',
    is_private: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.call_outcome) {
      alert('Please select a call outcome')
      return
    }

    setSaving(true)

    try {
      const callLogData: CallLogData = {
        call_outcome: formData.call_outcome,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        caller_name: formData.caller_name || undefined,
        caller_phone: formData.caller_phone || undefined,
        caller_email: formData.caller_email || undefined,
        follow_up_required: formData.follow_up_required || undefined,
        follow_up_date: formData.follow_up_date || undefined,
      }

      const res = await fetch(`/api/providers/${providerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: 'call_log',
          content: formData.content || 'Call log entry',
          call_log_data: callLogData,
          is_private: formData.is_private,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save call log')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving call log:', error)
      alert(error.message || 'Failed to save call log')
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>Log Phone Call</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Record details about this phone conversation</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="call_outcome">Call Outcome *</Label>
              <Select
                value={formData.call_outcome}
                onValueChange={(v) => setFormData({ ...formData, call_outcome: v as CallOutcome })}
                required
              >
                <SelectTrigger id="call_outcome">
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {callOutcomes.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                min="0"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="15"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="caller_name">Caller Name</Label>
              <Input
                id="caller_name"
                value={formData.caller_name}
                onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caller_phone">Caller Phone</Label>
              <Input
                id="caller_phone"
                type="tel"
                value={formData.caller_phone}
                onChange={(e) => setFormData({ ...formData, caller_phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caller_email">Caller Email</Label>
              <Input
                id="caller_email"
                type="email"
                value={formData.caller_email}
                onChange={(e) => setFormData({ ...formData, caller_email: e.target.value })}
                placeholder="caller@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Call Notes</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Discussed upcoming event participation, client needs assessment..."
              rows={4}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="follow_up_required"
                checked={formData.follow_up_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, follow_up_required: checked as boolean })
                }
              />
              <Label htmlFor="follow_up_required" className="font-normal">
                Follow-up required
              </Label>
            </div>

            {formData.follow_up_required && (
              <div className="flex items-center gap-2">
                <Label htmlFor="follow_up_date" className="text-sm">
                  Follow-up by:
                </Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="w-auto"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_private"
              checked={formData.is_private}
              onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked as boolean })}
            />
            <Label htmlFor="is_private" className="font-normal">
              Private (only visible to admins and provider contacts)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Call Log'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
