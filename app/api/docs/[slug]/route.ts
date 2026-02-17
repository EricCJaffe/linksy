import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

const ROLE_ORDER: Record<string, number> = {
  user: 0,
  provider_employee: 1,
  tenant_admin: 2,
  site_admin: 3,
}

async function getEffectiveRole(userId: string, role: string): Promise<string> {
  if (role === 'site_admin' || role === 'tenant_admin') return role

  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('linksy_provider_contacts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return 'provider_employee'
  return 'user'
}

/**
 * GET /api/docs/[slug]
 * Get a single published doc by slug. Returns 403 if role insufficient.
 */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = await createServiceClient()

  const { data: doc, error } = await supabase
    .from('linksy_docs')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check role access
  const effectiveRole = await getEffectiveRole(auth.user.id, auth.user.role)
  const userLevel = ROLE_ORDER[effectiveRole] ?? 0
  const docLevel = ROLE_ORDER[doc.min_role] ?? 0

  if (userLevel < docLevel) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(doc)
}

/**
 * PATCH /api/docs/[slug]
 * Update a doc (site_admin only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  if (!auth.isSiteAdmin) {
    return NextResponse.json({ error: 'Forbidden — site admin required' }, { status: 403 })
  }

  const body = await request.json()
  const { title, slug, content, excerpt, category, min_role, is_published, sort_order } = body

  const supabase = await createServiceClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (slug !== undefined) updates.slug = slug
  if (content !== undefined) updates.content = content
  if (excerpt !== undefined) updates.excerpt = excerpt
  if (category !== undefined) updates.category = category
  if (min_role !== undefined) updates.min_role = min_role
  if (is_published !== undefined) updates.is_published = is_published
  if (sort_order !== undefined) updates.sort_order = sort_order

  const { data: doc, error } = await supabase
    .from('linksy_docs')
    .update(updates)
    .eq('slug', params.slug)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(doc)
}

/**
 * DELETE /api/docs/[slug]
 * Hard-delete a doc (site_admin only).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  if (!auth.isSiteAdmin) {
    return NextResponse.json({ error: 'Forbidden — site admin required' }, { status: 403 })
  }

  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('linksy_docs')
    .delete()
    .eq('slug', params.slug)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
