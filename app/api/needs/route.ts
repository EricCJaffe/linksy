import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAdmin } from '@/lib/middleware/auth'

export async function POST(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { category_id, name, synonyms } = body

  if (!name || !category_id) {
    return NextResponse.json({ error: 'Name and category_id are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: need, error: insertError } = await supabase
    .from('linksy_needs')
    .insert({
      category_id,
      name,
      synonyms: synonyms || [],
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(need, { status: 201 })
}
