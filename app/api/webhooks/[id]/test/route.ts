import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantId, requireTenantAdmin, type AuthContext } from '@/lib/middleware/auth'
import { sendWebhookTest } from '@/lib/utils/webhooks'

function canAccessWebhook(auth: AuthContext, webhookTenantId: string): boolean {
  return auth.isSiteAdmin || getTenantId(auth) === webhookTenantId
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const supabase = await createServiceClient()
  const { data: webhook, error: webhookError } = await supabase
    .from('linksy_webhooks')
    .select('id, tenant_id')
    .eq('id', params.id)
    .single()

  if (webhookError || !webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  if (!canAccessWebhook(auth, webhook.tenant_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await sendWebhookTest(params.id)
    return NextResponse.json({
      success: true,
      delivery: {
        success: result.success,
        status_code: result.statusCode,
        duration_ms: result.durationMs,
        error_message: result.errorMessage,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send test webhook' },
      { status: 500 }
    )
  }
}
