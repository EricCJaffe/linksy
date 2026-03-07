import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, getTenantId } from '@/lib/middleware/auth'

/**
 * GET /api/contacts/[id]/notes
 * Get notes for a specific provider contact
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const supabase = await createServiceClient()

  const { data: notes, error } = await supabase
    .from('linksy_provider_notes')
    .select('*, user:users!author_id(full_name, email)')
    .eq('contact_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    // If column doesn't exist yet, return empty
    if (error.message.includes('contact_id')) {
      return NextResponse.json({ notes: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notes: notes || [] })
}

/**
 * POST /api/contacts/[id]/notes
 * Create a note for a specific provider contact
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const { content, note_type, is_private, call_log_data, provider_id } = body

  if (!content && !call_log_data) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  if (!provider_id) {
    return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const tenantId = getTenantId(auth)

  const { data: note, error } = await supabase
    .from('linksy_provider_notes')
    .insert({
      provider_id,
      contact_id: id,
      author_id: auth.user.id,
      note_type: note_type || 'general',
      content: content || '',
      is_private: is_private ?? false,
      call_log_data: call_log_data || null,
      ...(tenantId && { created_by_tenant_id: tenantId }),
    })
    .select()
    .single()

  if (error) {
    // If contact_id column doesn't exist, fall back to regular note
    if (error.message.includes('contact_id')) {
      const { data: fallbackNote, error: fallbackError } = await supabase
        .from('linksy_provider_notes')
        .insert({
          provider_id,
          author_id: auth.user.id,
          note_type: note_type || 'general',
          content: content ? `[Contact Note] ${content}` : '',
          is_private: is_private ?? false,
          call_log_data: call_log_data || null,
        })
        .select()
        .single()

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }
      return NextResponse.json(fallbackNote, { status: 201 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(note, { status: 201 })
}
