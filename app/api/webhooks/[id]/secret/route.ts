import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId, requireTenantAdmin, type AuthContext } from '@/lib/middleware/auth'

function canAccessWebhook(auth: AuthContext, webhookTenantId: string): boolean {
  return auth.isSiteAdmin || getTenantId(auth) === webhookTenantId
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const { data: webhook, error: webhookError } = await supabase
    .from('linksy_webhooks')
    .select('id, tenant_id, secret')
    .eq('id', params.id)
    .single()

  if (webhookError || !webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  if (!canAccessWebhook(auth, webhook.tenant_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    webhook_id: webhook.id,
    secret: webhook.secret,
  })
}
