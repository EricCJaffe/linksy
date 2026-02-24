import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/hosts/[slug]/crisis-overrides
 * List all crisis keyword overrides for this host
 */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  // Get host provider by slug
  const { data: host } = await supabase
    .from('linksy_providers')
    .select('id')
    .eq('slug', params.slug)
    .eq('is_host', true)
    .single()

  if (!host) {
    return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  }

  const { data: overrides, error: fetchError } = await supabase
    .from('linksy_host_crisis_overrides')
    .select('*, keyword:linksy_crisis_keywords(id, keyword, crisis_type, severity)')
    .eq('host_id', host.id)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ overrides: overrides || [], host_id: host.id })
}

/**
 * POST /api/hosts/[slug]/crisis-overrides
 * Add or update a crisis keyword override for this host
 */
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { keyword_id, action } = body

  if (!keyword_id || !['include', 'exclude'].includes(action)) {
    return NextResponse.json({ error: 'keyword_id and action (include/exclude) are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: host } = await supabase
    .from('linksy_providers')
    .select('id')
    .eq('slug', params.slug)
    .eq('is_host', true)
    .single()

  if (!host) {
    return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  }

  const { data: override, error: upsertError } = await supabase
    .from('linksy_host_crisis_overrides')
    .upsert(
      { host_id: host.id, keyword_id, action },
      { onConflict: 'host_id,keyword_id' }
    )
    .select()
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json(override, { status: 201 })
}

/**
 * DELETE /api/hosts/[slug]/crisis-overrides
 * Remove a crisis keyword override
 */
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const keywordId = searchParams.get('keyword_id')

  if (!keywordId) {
    return NextResponse.json({ error: 'keyword_id is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: host } = await supabase
    .from('linksy_providers')
    .select('id')
    .eq('slug', params.slug)
    .eq('is_host', true)
    .single()

  if (!host) {
    return NextResponse.json({ error: 'Host not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('linksy_host_crisis_overrides')
    .delete()
    .eq('host_id', host.id)
    .eq('keyword_id', keywordId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
