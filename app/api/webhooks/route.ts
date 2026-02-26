import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId, requireTenantAdmin, type AuthContext } from '@/lib/middleware/auth'
import { WEBHOOK_EVENT_TYPES } from '@/lib/utils/webhooks'

function resolveWebhookTenantId(auth: AuthContext, requestedTenantId?: string | null): string | null {
  if (auth.isSiteAdmin) {
    return requestedTenantId || getTenantId(auth) || null
  }
  return getTenantId(auth)
}

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

export async function GET(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const tenantId = resolveWebhookTenantId(auth, searchParams.get('tenant_id'))

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenant_id is required for site admins' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  const { data: webhooks, error: queryError } = await supabase
    .from('linksy_webhooks')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({
    webhooks: (webhooks || []).map(sanitizeWebhook),
    supported_events: WEBHOOK_EVENT_TYPES,
  })
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const supabase = await createServiceClient()

  let tenantId = resolveWebhookTenantId(auth, body.tenant_id)
  if (auth.isSiteAdmin && body.provider_id) {
    const { data: provider } = await supabase
      .from('linksy_providers')
      .select('tenant_id')
      .eq('id', body.provider_id)
      .single()
    if (provider?.tenant_id) {
      tenantId = provider.tenant_id
    }
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenant_id is required for site admins' },
      { status: 400 }
    )
  }

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'url must use http or https' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 })
  }

  const events = Array.isArray(body.events) ? body.events.filter((e: unknown) => typeof e === 'string') : []
  const invalidEvents = events.filter((event: string) => !WEBHOOK_EVENT_TYPES.includes(event as any))
  if (events.length === 0 || invalidEvents.length > 0) {
    return NextResponse.json(
      { error: `events must be a non-empty subset of: ${WEBHOOK_EVENT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const secret = typeof body.secret === 'string' && body.secret.trim().length > 0
    ? body.secret.trim()
    : crypto.randomBytes(32).toString('hex')

  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true

  const { data: webhook, error: insertError } = await supabase
    .from('linksy_webhooks')
    .insert({
      tenant_id: tenantId,
      url,
      events,
      secret,
      is_active: isActive,
      created_by: auth.user.id,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(sanitizeWebhook(webhook), { status: 201 })
}
