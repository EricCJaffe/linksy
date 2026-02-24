import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId, requireTenantAdmin, type AuthContext } from '@/lib/middleware/auth'
import { WEBHOOK_EVENT_TYPES } from '@/lib/utils/webhooks'

function sanitizeWebhook(webhook: any) {
  return {
    id: webhook.id,
    tenant_id: webhook.tenant_id,
    url: webhook.url,
    events: webhook.events || [],
    is_active: webhook.is_active,
    created_by: webhook.created_by,
    created_at: webhook.created_at,
    updated_at: webhook.updated_at,
    last_delivery_at: webhook.last_delivery_at,
    last_error: webhook.last_error,
    has_secret: Boolean(webhook.secret),
  }
}

function canAccessWebhook(auth: AuthContext, webhookTenantId: string): boolean {
  return auth.isSiteAdmin || getTenantId(auth) === webhookTenantId
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const { data: webhook, error: webhookError } = await supabase
    .from('linksy_webhooks')
    .select('*')
    .eq('id', params.id)
    .single()

  if (webhookError || !webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  if (!canAccessWebhook(auth, webhook.tenant_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('event_type') || 'all'
  const successFilter = searchParams.get('success') || 'all'
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('page_size') || '20', 10), 1), 100)
  const offset = (page - 1) * pageSize

  let deliveriesQuery = supabase
    .from('linksy_webhook_deliveries')
    .select('id, event_type, status_code, success, duration_ms, error_message, created_at', { count: 'exact' })
    .eq('webhook_id', webhook.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (eventType !== 'all') {
    deliveriesQuery = deliveriesQuery.eq('event_type', eventType)
  }

  if (successFilter === 'success') {
    deliveriesQuery = deliveriesQuery.eq('success', true)
  } else if (successFilter === 'failed') {
    deliveriesQuery = deliveriesQuery.eq('success', false)
  }

  const { data: deliveries, count, error: deliveriesError } = await deliveriesQuery

  if (deliveriesError) {
    return NextResponse.json({ error: deliveriesError.message }, { status: 500 })
  }

  return NextResponse.json({
    webhook: sanitizeWebhook(webhook),
    deliveries: deliveries || [],
    pagination: {
      page,
      page_size: pageSize,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
      has_more: offset + pageSize < (count || 0),
    },
    supported_events: WEBHOOK_EVENT_TYPES,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const { data: existingWebhook, error: existingError } = await supabase
    .from('linksy_webhooks')
    .select('*')
    .eq('id', params.id)
    .single()

  if (existingError || !existingWebhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  if (!canAccessWebhook(auth, existingWebhook.tenant_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const updates: Record<string, unknown> = {}

  if ('url' in body) {
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    if (!url) {
      return NextResponse.json({ error: 'url cannot be empty' }, { status: 400 })
    }
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'url must use http or https' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 })
    }
    updates.url = url
  }

  if ('events' in body) {
    const events = Array.isArray(body.events) ? body.events.filter((e: unknown) => typeof e === 'string') : []
    const invalidEvents = events.filter((event: string) => !WEBHOOK_EVENT_TYPES.includes(event as any))
    if (events.length === 0 || invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `events must be a non-empty subset of: ${WEBHOOK_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    updates.events = events
  }

  if ('is_active' in body) {
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 })
    }
    updates.is_active = body.is_active
  }

  if (body.rotate_secret === true) {
    updates.secret = crypto.randomBytes(32).toString('hex')
  } else if ('secret' in body) {
    const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
    if (!secret) {
      return NextResponse.json({ error: 'secret cannot be empty' }, { status: 400 })
    }
    updates.secret = secret
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: webhook, error: updateError } = await supabase
    .from('linksy_webhooks')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(sanitizeWebhook(webhook))
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const { data: existingWebhook, error: existingError } = await supabase
    .from('linksy_webhooks')
    .select('id, tenant_id')
    .eq('id', params.id)
    .single()

  if (existingError || !existingWebhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  if (!canAccessWebhook(auth, existingWebhook.tenant_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('linksy_webhooks')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
