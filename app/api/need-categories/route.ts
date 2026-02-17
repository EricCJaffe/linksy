import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireTenantAdmin } from '@/lib/middleware/auth'

export async function GET() {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()

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

  // Nest needs under their categories
  const result = (categories || []).map((cat: any) => ({
    ...cat,
    needs: (needs || []).filter((n: any) => n.category_id === cat.id),
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { name, description, airs_code, sort_order } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: category, error: insertError } = await supabase
    .from('linksy_need_categories')
    .insert({ name, description: description ?? null, airs_code: airs_code ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(category, { status: 201 })
}
