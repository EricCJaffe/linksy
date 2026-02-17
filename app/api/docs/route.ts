import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

// Role ordering for visibility checks
const ROLE_ORDER: Record<string, number> = {
  user: 0,
  provider_employee: 1,
  tenant_admin: 2,
  site_admin: 3,
}

// Determine the effective role for doc filtering
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

function getAllowedRoles(effectiveRole: string): string[] {
  const level = ROLE_ORDER[effectiveRole] ?? 0
  return Object.entries(ROLE_ORDER)
    .filter(([, v]) => v <= level)
    .map(([k]) => k)
}

/**
 * GET /api/docs
 * List published docs, filtered by user role.
 * Optional query params: ?q= (FTS), ?category=
 */
export async function GET(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category')?.trim() || ''

  const effectiveRole = await getEffectiveRole(auth.user.id, auth.user.role)
  const allowedRoles = getAllowedRoles(effectiveRole)

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_docs')
    .select('id, title, slug, excerpt, category, min_role, is_published, sort_order, created_at, updated_at')
    .eq('is_published', true)
    .in('min_role', allowedRoles)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (q) {
    query = query.textSearch('search_vector', q, { type: 'websearch' })
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data: docs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ docs: docs || [] })
}

/**
 * POST /api/docs
 * Create a new doc (site_admin only).
 */
export async function POST(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  if (!auth.isSiteAdmin) {
    return NextResponse.json({ error: 'Forbidden — site admin required' }, { status: 403 })
  }

  const body = await request.json()
  const { title, slug, content, excerpt, category, min_role, is_published, sort_order } = body

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Auto-generate slug from title if not provided
  const finalSlug =
    slug?.trim() ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)

  const supabase = await createServiceClient()

  const { data: doc, error } = await supabase
    .from('linksy_docs')
    .insert({
      title: title.trim(),
      slug: finalSlug,
      content: content || '',
      excerpt: excerpt || null,
      category: category || 'General',
      min_role: min_role || 'user',
      is_published: is_published ?? true,
      sort_order: sort_order ?? 0,
      author_id: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(doc, { status: 201 })
}
