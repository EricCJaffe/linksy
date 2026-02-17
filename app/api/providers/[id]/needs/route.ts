import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * POST /api/providers/[id]/needs
 * Add a need to a provider
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId } = params
  const body = await request.json()
  const { need_id, source = 'manual', is_confirmed = true } = body

  if (!need_id) {
    return NextResponse.json({ error: 'need_id is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: providerNeed, error: insertError } = await supabase
    .from('linksy_provider_needs')
    .insert({
      provider_id: providerId,
      need_id,
      source,
      is_confirmed,
    })
    .select()
    .single()

  if (insertError) {
    // Ignore duplicate — need already linked
    if (insertError.code === '23505') {
      return NextResponse.json({ message: 'Need already linked' }, { status: 200 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(providerNeed, { status: 201 })
}

/**
 * DELETE /api/providers/[id]/needs
 * Remove a need from a provider (pass need_id as query param)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId } = params
  const { searchParams } = new URL(request.url)
  const need_id = searchParams.get('need_id')

  if (!need_id) {
    return NextResponse.json({ error: 'need_id query param is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { error: deleteError } = await supabase
    .from('linksy_provider_needs')
    .delete()
    .eq('provider_id', providerId)
    .eq('need_id', need_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
