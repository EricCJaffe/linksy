import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/public/need-categories
 * Public endpoint — no auth required.
 * Returns need categories with their nested needs.
 */
export async function GET() {
  const supabase = await createServiceClient()

  const { data: categories, error: queryError } = await supabase
    .from('linksy_need_categories')
    .select('id, name, slug, description, sort_order, airs_code, is_active')
    .order('sort_order', { ascending: true })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  const { data: needs, error: needsError } = await supabase
    .from('linksy_needs')
    .select('id, category_id, name, synonyms, is_active')
    .order('name', { ascending: true })

  if (needsError) {
    return NextResponse.json({ error: needsError.message }, { status: 500 })
  }

  const result = (categories || []).map((cat: any) => ({
    ...cat,
    needs: (needs || []).filter((n: any) => n.category_id === cat.id),
  }))

  return NextResponse.json(result)
}
