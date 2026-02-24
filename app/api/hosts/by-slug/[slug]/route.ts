import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/hosts/[slug]
 * Resolves a host provider by slug for widget page load.
 * Public endpoint — no auth required.
 * Returns 404 if host not found, inactive, or embed disabled.
 */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('linksy_resolve_host', {
    p_slug: slug,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  }

  const host = data[0]

  if (host.over_budget) {
    return NextResponse.json(
      { error: 'Monthly search budget reached. Please contact support.' },
      { status: 429 }
    )
  }

  return NextResponse.json({
    provider_id: host.provider_id,
    provider_name: host.provider_name,
    widget_config: host.widget_config ?? {},
  })
}
