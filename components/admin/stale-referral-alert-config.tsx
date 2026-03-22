'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, Clock, Mail, Save, X, Plus, Loader2 } from 'lucide-react'

interface AlertConfig {
  is_enabled: boolean
  threshold_hours: number
  notify_emails: string[]
  notify_site_admins: boolean
  sla_reminder_enabled: boolean
}

export function StaleReferralAlertConfig() {
  const [config, setConfig] = useState<AlertConfig>({
    is_enabled: true,
    threshold_hours: 48,
    notify_emails: [],
    notify_site_admins: true,
    sla_reminder_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/referral-alert-config')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          is_enabled: data.is_enabled ?? true,
          threshold_hours: data.threshold_hours ?? 48,
          notify_emails: data.notify_emails ?? [],
          notify_site_admins: data.notify_site_admins ?? true,
          sla_reminder_enabled: data.sla_reminder_enabled ?? false,
        })
      }
    } catch (err) {
      console.error('Failed to load alert config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/referral-alert-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error || 'Failed to save')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (config.notify_emails.includes(email)) return
    setConfig((prev) => ({ ...prev, notify_emails: [...prev.notify_emails, email] }))
    setNewEmail('')
  }

  const removeEmail = (email: string) => {
    setConfig((prev) => ({
      ...prev,
      notify_emails: prev.notify_emails.filter((e) => e !== email),
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Stale Referral Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Stale Referral Alerts
            </CardTitle>
            <CardDescription>
              Auto-email when referrals stay Pending too long
            </CardDescription>
          </div>
          <Switch
            checked={config.is_enabled}
            onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, is_enabled: checked }))}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Threshold */}
        <div className="space-y-1.5">
          <Label>Alert after pending for</Label>
          <Select
            value={config.threshold_hours.toString()}
            onValueChange={(v) => setConfig((prev) => ({ ...prev, threshold_hours: parseInt(v) }))}
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

        {/* Site admins toggle */}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Notify all site admins</Label>
            <p className="text-xs text-muted-foreground">
              Automatically email every user with the site_admin role
            </p>
          </div>
          <Switch
            checked={config.notify_site_admins}
            onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, notify_site_admins: checked }))}
          />
        </div>

        {/* Additional email recipients */}
        <div className="space-y-2">
          <Label>Additional recipients</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail() } }}
            />
            <Button size="sm" variant="outline" onClick={addEmail} disabled={!newEmail.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {config.notify_emails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {config.notify_emails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pr-1">
                  <Mail className="h-3 w-3" />
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {config.notify_emails.length === 0 && !config.notify_site_admins && (
            <p className="text-xs text-amber-600">
              No recipients configured. Add emails or enable site admin notifications.
            </p>
          )}
        </div>

        {/* Schedule info */}
        <p className="text-xs text-muted-foreground">
          Checked daily at 8:00 AM ET. Only sends when there are stale referrals.
        </p>

        {/* SLA Reminder Master Switch */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                SLA Reminder Emails
              </Label>
              <p className="text-xs text-muted-foreground">
                Send per-provider SLA reminder emails to default referral handlers when referrals exceed the provider&apos;s configured reminder threshold. Each provider can set their own SLA and reminder times on their provider page.
              </p>
            </div>
            <Switch
              checked={config.sla_reminder_enabled}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, sla_reminder_enabled: checked }))}
            />
          </div>
          {config.sla_reminder_enabled && (
            <p className="text-xs text-muted-foreground mt-2">
              Runs daily at 9:00 AM ET. Sends one reminder per referral to the provider&apos;s default referral handler.
              Providers default to 24-hour SLA / 48-hour reminder, configurable per provider.
            </p>
          )}
        </div>

        {/* Save button */}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-1" />Save Configuration</>
            )}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved</span>
          )}
          {error && (
            <span className="text-sm text-destructive">{error}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
