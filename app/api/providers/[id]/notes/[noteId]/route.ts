import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * PATCH /api/providers/[id]/notes/[noteId]
 * Update an existing note
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { noteId } = params
  const body = await request.json()
  const { note_type, content, is_private } = body

  if (!note_type && !content && is_private === undefined) {
    return NextResponse.json(
      { error: 'note_type, content, or is_private is required' },
      { status: 400 }
    )
  }

  if (note_type && !['general', 'outreach', 'update', 'internal'].includes(note_type)) {
    return NextResponse.json(
      { error: 'Invalid note_type' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Check if note exists and user has permission to edit it
  const { data: existingNote } = await supabase
    .from('linksy_provider_notes')
    .select('user_id')
    .eq('id', noteId)
    .single()

  if (!existingNote) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  if (existingNote.user_id !== auth.user.id && !auth.isSiteAdmin) {
    return NextResponse.json(
      { error: 'You can only edit your own notes' },
      { status: 403 }
    )
  }

  const updates: Record<string, any> = {}
  if (note_type) updates.note_type = note_type
  if (content) updates.content = content
  if (is_private !== undefined) updates.is_private = is_private

  const { data: note, error } = await supabase
    .from('linksy_provider_notes')
    .update(updates)
    .eq('id', noteId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Manually fetch user data to work around schema cache issue
  const { data: user } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', note.user_id)
    .maybeSingle()

  return NextResponse.json({ ...note, user })
}
