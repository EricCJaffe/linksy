'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, Save, Loader2 } from 'lucide-react'
import { useUpdateProvider } from '@/lib/hooks/useProviders'

interface SlaSettingsCardProps {
  providerId: string
  slaHours: number
  slaReminderHours: number
  canEdit: boolean
}

export function SlaSettingsCard({ providerId, slaHours, slaReminderHours, canEdit }: SlaSettingsCardProps) {
  const updateProvider = useUpdateProvider()
  const [localSlaHours, setLocalSlaHours] = useState(slaHours.toString())
  const [localReminderHours, setLocalReminderHours] = useState(slaReminderHours.toString())
  const [saved, setSaved] = useState(false)

  const isDirty =
    localSlaHours !== slaHours.toString() ||
    localReminderHours !== slaReminderHours.toString()

  const handleSave = async () => {
    updateProvider.mutate(
      {
        id: providerId,
        sla_hours: parseInt(localSlaHours),
        sla_reminder_hours: parseInt(localReminderHours),
      } as any,
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          SLA & Reminder Settings
        </CardTitle>
        <CardDescription>
          Configure how long this provider has to respond to referrals and when reminder emails are sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>SLA Deadline</Label>
          <p className="text-xs text-muted-foreground">
            How long this provider has to respond to a new referral before it&apos;s considered overdue.
          </p>
          <Select
            value={localSlaHours}
            onValueChange={setLocalSlaHours}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 hours</SelectItem>
              <SelectItem value="24">24 hours (1 day)</SelectItem>
              <SelectItem value="48">48 hours (2 days)</SelectItem>
              <SelectItem value="72">72 hours (3 days)</SelectItem>
              <SelectItem value="96">96 hours (4 days)</SelectItem>
              <SelectItem value="120">120 hours (5 days)</SelectItem>
              <SelectItem value="168">168 hours (7 days)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>SLA Reminder Notification</Label>
          <p className="text-xs text-muted-foreground">
            When to send a reminder email to the default referral handler if the referral is still pending.
          </p>
          <Select
            value={localReminderHours}
            onValueChange={setLocalReminderHours}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 hours (1 day)</SelectItem>
              <SelectItem value="48">48 hours (2 days)</SelectItem>
              <SelectItem value="72">72 hours (3 days)</SelectItem>
              <SelectItem value="96">96 hours (4 days)</SelectItem>
              <SelectItem value="120">120 hours (5 days)</SelectItem>
              <SelectItem value="168">168 hours (7 days)</SelectItem>
              <SelectItem value="336">336 hours (14 days)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          SLA reminders are controlled by a site-wide master switch in Admin &gt; Dashboard. When enabled,
          one reminder email is sent per referral to the default referral handler contact.
        </p>

        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={updateProvider.isPending || !isDirty}>
              {updateProvider.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-1" />Save SLA Settings</>
              )}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Saved</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
