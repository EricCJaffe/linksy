'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Copy,
  Eye,
  Loader2,
  Plus,
  RotateCw,
  Save,
  Send,
  Trash2,
  Webhook,
} from 'lucide-react'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

type WebhookEventType = 'ticket.created' | 'ticket.status_changed'
type DeliveryEventType = WebhookEventType | 'webhook.test'
type DeliveryResultFilter = 'all' | 'success' | 'failed'

interface WebhookRecord {
  id: string
  tenant_id: string
  url: string
  events: WebhookEventType[]
  is_active: boolean
  created_at: string
  updated_at: string
  last_delivery_at: string | null
  last_error: string | null
  has_secret: boolean
}

interface WebhookDelivery {
  id: string
  event_type: string
  status_code: number | null
  success: boolean
  duration_ms: number | null
  error_message: string | null
  created_at: string
}

interface DeliveryPagination {
  page: number
  page_size: number
  total: number
  total_pages: number
  has_more: boolean
}

interface TenantOption {
  id: string
  name: string
}

const DEFAULT_EVENT_SELECTION: Record<WebhookEventType, boolean> = {
  'ticket.created': true,
  'ticket.status_changed': true,
}

const DEFAULT_DELIVERY_PAGINATION: DeliveryPagination = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 0,
  has_more: false,
}

export default function AdminWebhooksPage() {
  const { data: currentTenant } = useCurrentTenant()
  const { data: user } = useCurrentUser()

  const isSiteAdmin = user?.profile?.role === 'site_admin'

  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  const [supportedEvents, setSupportedEvents] = useState<WebhookEventType[]>([
    'ticket.created',
    'ticket.status_changed',
  ])

  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [createUrl, setCreateUrl] = useState('')
  const [createSecret, setCreateSecret] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)
  const [createEvents, setCreateEvents] = useState<Record<WebhookEventType, boolean>>(DEFAULT_EVENT_SELECTION)

  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editEvents, setEditEvents] = useState<Record<WebhookEventType, boolean>>(DEFAULT_EVENT_SELECTION)

  const [deliveryWebhookId, setDeliveryWebhookId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [deliveryEventFilter, setDeliveryEventFilter] = useState<'all' | DeliveryEventType>('all')
  const [deliveryResultFilter, setDeliveryResultFilter] = useState<DeliveryResultFilter>('all')
  const [deliveryPage, setDeliveryPage] = useState(1)
  const [deliveryPagination, setDeliveryPagination] = useState<DeliveryPagination>(DEFAULT_DELIVERY_PAGINATION)

  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!selectedTenantId && currentTenant?.tenant?.id) {
      setSelectedTenantId(currentTenant.tenant.id)
    }
  }, [currentTenant, selectedTenantId])

  useEffect(() => {
    if (!isSiteAdmin) return

    async function loadTenants() {
      try {
        const response = await fetch('/api/tenants')
        if (!response.ok) return
        const data = await response.json()
        const mapped: TenantOption[] = (data || []).map((tenant: any) => ({
          id: tenant.id,
          name: tenant.name,
        }))
        setTenants(mapped)

        if (!selectedTenantId && mapped.length > 0) {
          setSelectedTenantId(mapped[0].id)
        }
      } catch {
        // no-op
      }
    }

    loadTenants()
  }, [isSiteAdmin, selectedTenantId])

  const tenantQuery = useMemo(() => {
    if (!selectedTenantId) return ''
    return `?tenant_id=${encodeURIComponent(selectedTenantId)}`
  }, [selectedTenantId])

  async function fetchWebhooks() {
    if (isSiteAdmin && !selectedTenantId) {
      setIsLoading(false)
      setWebhooks([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/webhooks${tenantQuery}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load webhooks')
      }

      setWebhooks(data.webhooks || [])
      if (Array.isArray(data.supported_events) && data.supported_events.length > 0) {
        setSupportedEvents(data.supported_events)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantQuery])

  function selectedEvents(selection: Record<WebhookEventType, boolean>): WebhookEventType[] {
    return supportedEvents.filter((event) => selection[event])
  }

  async function handleCreateWebhook() {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const events = selectedEvents(createEvents)
      if (events.length === 0) {
        throw new Error('Select at least one event')
      }

      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedTenantId || undefined,
          url: createUrl,
          secret: createSecret || undefined,
          is_active: createIsActive,
          events,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create webhook')
      }

      setCreateUrl('')
      setCreateSecret('')
      setCreateIsActive(true)
      setCreateEvents(DEFAULT_EVENT_SELECTION)
      setSuccessMessage('Webhook created.')
      await fetchWebhooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook')
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(webhook: WebhookRecord) {
    setEditingWebhookId(webhook.id)
    setEditUrl(webhook.url)
    setEditIsActive(webhook.is_active)

    const next: Record<WebhookEventType, boolean> = {
      'ticket.created': false,
      'ticket.status_changed': false,
    }
    webhook.events.forEach((event) => {
      next[event] = true
    })
    setEditEvents(next)
  }

  async function handleUpdateWebhook() {
    if (!editingWebhookId) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const events = selectedEvents(editEvents)
      if (events.length === 0) {
        throw new Error('Select at least one event')
      }

      const response = await fetch(`/api/webhooks/${editingWebhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: editUrl,
          is_active: editIsActive,
          events,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update webhook')
      }

      setEditingWebhookId(null)
      setSuccessMessage('Webhook updated.')
      await fetchWebhooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update webhook')
    } finally {
      setIsSaving(false)
    }
  }

  async function rotateSecret(webhookId: string) {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate_secret: true }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rotate secret')
      }

      setRevealedSecrets((prev) => {
        const next = { ...prev }
        delete next[webhookId]
        return next
      })

      setSuccessMessage('Webhook secret rotated.')
      await fetchWebhooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate secret')
    } finally {
      setIsSaving(false)
    }
  }

  async function revealSecret(webhookId: string) {
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/webhooks/${webhookId}/secret`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reveal secret')
      }

      setRevealedSecrets((prev) => ({ ...prev, [webhookId]: data.secret }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal secret')
    }
  }

  async function copySecret(webhookId: string) {
    const secret = revealedSecrets[webhookId]
    if (!secret) return

    try {
      await navigator.clipboard.writeText(secret)
      setSuccessMessage('Secret copied to clipboard.')
    } catch {
      setError('Could not copy secret. Please copy manually.')
    }
  }

  async function sendTest(webhookId: string) {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test webhook')
      }

      setSuccessMessage('Test webhook sent.')
      await fetchWebhooks()
      if (deliveryWebhookId === webhookId) {
        await loadDeliveries(webhookId, deliveryPage)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test webhook')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteWebhook(webhookId: string) {
    if (!confirm('Delete this webhook?')) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete webhook')
      }

      if (deliveryWebhookId === webhookId) {
        setDeliveryWebhookId(null)
        setDeliveries([])
      }

      setRevealedSecrets((prev) => {
        const next = { ...prev }
        delete next[webhookId]
        return next
      })

      setSuccessMessage('Webhook deleted.')
      await fetchWebhooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook')
    } finally {
      setIsSaving(false)
    }
  }

  async function loadDeliveries(webhookId: string, page = 1) {
    setDeliveryWebhookId(webhookId)
    setDeliveryPage(page)
    setLoadingDeliveries(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (deliveryEventFilter !== 'all') params.set('event_type', deliveryEventFilter)
      if (deliveryResultFilter !== 'all') params.set('success', deliveryResultFilter)
      params.set('page', String(page))
      params.set('page_size', '20')

      const response = await fetch(`/api/webhooks/${webhookId}?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load deliveries')
      }
      setDeliveries(data.deliveries || [])
      setDeliveryPagination(data.pagination || DEFAULT_DELIVERY_PAGINATION)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliveries')
    } finally {
      setLoadingDeliveries(false)
    }
  }

  useEffect(() => {
    if (deliveryWebhookId) {
      loadDeliveries(deliveryWebhookId, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryEventFilter, deliveryResultFilter])

  const deliveryEventOptions: Array<'all' | DeliveryEventType> = [
    'all',
    ...supportedEvents,
    'webhook.test',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Webhook className="h-8 w-8" />
          Webhooks
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage outbound webhook subscriptions for referral lifecycle events.
        </p>
      </div>

      {isSiteAdmin && tenants.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="max-w-sm space-y-2">
              <Label>Tenant</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="create-url">Endpoint URL</Label>
              <Input
                id="create-url"
                value={createUrl}
                onChange={(e) => setCreateUrl(e.target.value)}
                placeholder="https://example.com/webhooks/linksy"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="create-secret">Signing Secret (optional)</Label>
              <Input
                id="create-secret"
                value={createSecret}
                onChange={(e) => setCreateSecret(e.target.value)}
                placeholder="Leave blank to auto-generate"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subscribed Events</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {supportedEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={createEvents[event]}
                    onCheckedChange={(checked) => {
                      setCreateEvents((prev) => ({ ...prev, [event]: checked === true }))
                    }}
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={createIsActive} onCheckedChange={(v) => setCreateIsActive(v === true)} />
            Active
          </label>

          <Button
            onClick={handleCreateWebhook}
            disabled={isSaving || !createUrl.trim() || (isSiteAdmin && !selectedTenantId)}
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Webhook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Secret</TableHead>
                  <TableHead>Last Delivery</TableHead>
                  <TableHead>Last Error</TableHead>
                  <TableHead className="w-[320px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Loading webhooks...
                    </TableCell>
                  </TableRow>
                ) : webhooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No webhooks configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="max-w-[280px] truncate" title={webhook.url}>
                        {webhook.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={webhook.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                          {webhook.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {revealedSecrets[webhook.id] ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs truncate" title={revealedSecrets[webhook.id]}>
                              {revealedSecrets[webhook.id]}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => copySecret(webhook.id)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => revealSecret(webhook.id)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Reveal
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {webhook.last_delivery_at ? new Date(webhook.last_delivery_at).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={webhook.last_error || ''}>
                        {webhook.last_error || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditing(webhook)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => sendTest(webhook.id)}>
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Test
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => loadDeliveries(webhook.id, 1)}>
                            Deliveries
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => rotateSecret(webhook.id)}>
                            <RotateCw className="h-3.5 w-3.5 mr-1" />
                            Rotate
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteWebhook(webhook.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingWebhookId && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-url">Endpoint URL</Label>
              <Input id="edit-url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Subscribed Events</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {supportedEvents.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={editEvents[event]}
                      onCheckedChange={(checked) => {
                        setEditEvents((prev) => ({ ...prev, [event]: checked === true }))
                      }}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={editIsActive} onCheckedChange={(v) => setEditIsActive(v === true)} />
              Active
            </label>

            <div className="flex gap-2">
              <Button onClick={handleUpdateWebhook} disabled={isSaving || !editUrl.trim()}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingWebhookId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {deliveryWebhookId && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="w-56">
                <Label className="mb-1 block">Event</Label>
                <Select
                  value={deliveryEventFilter}
                  onValueChange={(v) => setDeliveryEventFilter(v as 'all' | DeliveryEventType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryEventOptions.map((event) => (
                      <SelectItem key={event} value={event}>
                        {event}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-44">
                <Label className="mb-1 block">Result</Label>
                <Select
                  value={deliveryResultFilter}
                  onValueChange={(v) => setDeliveryResultFilter(v as DeliveryResultFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Status Code</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDeliveries ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                        Loading deliveries...
                      </TableCell>
                    </TableRow>
                  ) : deliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                        No deliveries yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveries.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell>{delivery.event_type}</TableCell>
                        <TableCell>
                          <Badge className={delivery.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {delivery.success ? 'Success' : 'Failed'}
                          </Badge>
                        </TableCell>
                        <TableCell>{delivery.status_code ?? '-'}</TableCell>
                        <TableCell>{delivery.duration_ms ? `${delivery.duration_ms}ms` : '-'}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={delivery.error_message || ''}>
                          {delivery.error_message || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(delivery.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {deliveryPagination.page} of {Math.max(deliveryPagination.total_pages, 1)} ({deliveryPagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deliveryPagination.page <= 1 || loadingDeliveries}
                  onClick={() => loadDeliveries(deliveryWebhookId, deliveryPagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!deliveryPagination.has_more || loadingDeliveries}
                  onClick={() => loadDeliveries(deliveryWebhookId, deliveryPagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
