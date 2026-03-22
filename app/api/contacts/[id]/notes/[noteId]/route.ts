import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * PATCH /api/contacts/[id]/notes/[noteId]
 * Update an existing note for a specific provider contact
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { noteId } = await params
  const body = await request.json()
  const { content, note_type, is_private, call_log_data } = body

  if (!content && !note_type && is_private === undefined && call_log_data === undefined) {
    return NextResponse.json(
      { error: 'At least one field (content, note_type, is_private, call_log_data) is required' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Check note exists
  const { data: existing, error: fetchError } = await supabase
    .from('linksy_provider_notes')
    .select('id, author_id')
    .eq('id', noteId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  // Only author or site admin can edit
  if (existing.author_id && existing.author_id !== auth.user.id && !auth.isSiteAdmin) {
    return NextResponse.json(
      { error: 'You can only edit your own notes' },
      { status: 403 }
    )
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (content !== undefined) updates.content = content
  if (note_type) updates.note_type = note_type
  if (is_private !== undefined) updates.is_private = is_private
  if (call_log_data !== undefined) updates.call_log_data = call_log_data

  const { data: note, error } = await supabase
    .from('linksy_provider_notes')
    .update(updates)
    .eq('id', noteId)
    .select('*, user:users!author_id(full_name, email)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(note)
}
