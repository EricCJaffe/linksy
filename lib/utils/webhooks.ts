import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export const WEBHOOK_EVENT_TYPES = [
  'ticket.created',
  'ticket.status_changed',
  'ticket.reassigned',
  'ticket.forwarded',
  'ticket.assigned',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

interface WebhookRecord {
  id: string
  tenant_id: string
  url: string
  secret: string
  events: string[] | null
  is_active: boolean
}

interface SendWebhookEventInput {
  tenantId: string
  eventType: WebhookEventType
  payload: Record<string, unknown>
}

interface DeliveryResult {
  success: boolean
  statusCode: number | null
  durationMs: number
  responseBody: string | null
  errorMessage: string | null
}

function signPayload(secret: string, timestamp: string, body: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')
}

function isSubscribedToEvent(webhookEvents: string[] | null, eventType: WebhookEventType): boolean {
  if (!webhookEvents || webhookEvents.length === 0) {
    return false
  }
  return webhookEvents.includes(eventType)
}

async function deliverWebhook(
  webhook: WebhookRecord,
  eventType: string,
  payload: Record<string, unknown>
): Promise<DeliveryResult> {
  const startedAt = Date.now()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const envelope = {
    id: crypto.randomUUID(),
    event: eventType,
    created_at: new Date().toISOString(),
    data: payload,
  }
  const body = JSON.stringify(envelope)
  const signature = signPayload(webhook.secret, timestamp, body)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Linksy-Webhooks/1.0',
        'X-Linksy-Event': eventType,
        'X-Linksy-Timestamp': timestamp,
        'X-Linksy-Signature': `t=${timestamp},v1=${signature}`,
      },
      body,
      signal: controller.signal,
    })

    const text = await response.text().catch(() => '')

    return {
      success: response.ok,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      responseBody: text.slice(0, 2000) || null,
      errorMessage: response.ok ? null : `Non-2xx response (${response.status})`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delivery error'

    return {
      success: false,
      statusCode: null,
      durationMs: Date.now() - startedAt,
      responseBody: null,
      errorMessage: message,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function recordDeliveryAndUpdateWebhook(
  webhook: WebhookRecord,
  eventType: string,
  payload: Record<string, unknown>
): Promise<DeliveryResult> {
  const supabase = await createServiceClient()
  const result = await deliverWebhook(webhook, eventType, payload)

  await supabase.from('linksy_webhook_deliveries').insert({
    webhook_id: webhook.id,
    event_type: eventType,
    payload,
    status_code: result.statusCode,
    success: result.success,
    duration_ms: result.durationMs,
    response_body: result.responseBody,
    error_message: result.errorMessage,
  })

  await supabase
    .from('linksy_webhooks')
    .update({
      last_delivery_at: new Date().toISOString(),
      last_error: result.success ? null : result.errorMessage,
    })
    .eq('id', webhook.id)

  return result
}

export async function sendWebhookEvent(input: SendWebhookEventInput): Promise<void> {
  const { tenantId, eventType, payload } = input

  const supabase = await createServiceClient()

  const { data: hooks, error } = await supabase
    .from('linksy_webhooks')
    .select('id, tenant_id, url, secret, events, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error || !hooks || hooks.length === 0) {
    return
  }

  const subscribedHooks = (hooks as WebhookRecord[]).filter((hook) =>
    isSubscribedToEvent(hook.events, eventType)
  )

  if (subscribedHooks.length === 0) {
    return
  }

  await Promise.all(subscribedHooks.map((hook) => recordDeliveryAndUpdateWebhook(hook, eventType, payload)))
}

export async function sendWebhookTest(webhookId: string, payload?: Record<string, unknown>) {
  const supabase = await createServiceClient()
  const { data: hook, error } = await supabase
    .from('linksy_webhooks')
    .select('id, tenant_id, url, secret, events, is_active')
    .eq('id', webhookId)
    .single()

  if (error || !hook) {
    throw new Error('Webhook not found')
  }

  const result = await recordDeliveryAndUpdateWebhook(hook as WebhookRecord, 'webhook.test', {
    message: 'This is a test webhook delivery from Linksy.',
    sent_at: new Date().toISOString(),
    ...(payload || {}),
  })

  return result
}

/**
 * Helper function to fire a webhook event with explicit tenant/site ID
 * For Linksy, site_id is used as the tenant_id for webhook delivery
 */
export async function fireWebhook(
  eventType: WebhookEventType,
  siteId: string,
  payload: Record<string, unknown>
): Promise<void> {
  return sendWebhookEvent({
    tenantId: siteId,
    eventType,
    payload,
  })
}
