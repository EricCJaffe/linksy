import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

function getMissingColumnName(errorMessage: string): string | null {
  const schemaCacheMatch = errorMessage.match(/Could not find the '([^']+)' column/i)
  if (schemaCacheMatch) return schemaCacheMatch[1]

  const sqlMatch = errorMessage.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i)
  if (sqlMatch) return sqlMatch[1]

  return null
}

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
  const { note_type, content, is_private, attachments, is_pinned } = body

  if (!note_type && !content && is_private === undefined && attachments === undefined && is_pinned === undefined) {
    return NextResponse.json(
      { error: 'note_type, content, is_private, attachments, or is_pinned is required' },
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

  // Check if note exists and user has permission to edit it (schema-compatible)
  const ownerCheck = await supabase
    .from('linksy_provider_notes')
    .select('id, user_id')
    .eq('id', noteId)
    .single()

  let existingNote: any = ownerCheck.data
  let ownerCheckBypassed = false

  if (ownerCheck.error && getMissingColumnName(ownerCheck.error.message || '') === 'user_id') {
    const fallback = await supabase
      .from('linksy_provider_notes')
      .select('id')
      .eq('id', noteId)
      .single()
    existingNote = fallback.data
    ownerCheckBypassed = !fallback.error
  }

  if (!existingNote) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  if (!ownerCheckBypassed && existingNote.user_id !== auth.user.id && !auth.isSiteAdmin) {
    return NextResponse.json(
      { error: 'You can only edit your own notes' },
      { status: 403 }
    )
  }

  const updates: Record<string, any> = {}
  if (note_type) updates.note_type = note_type
  if (content) updates.content = content
  if (is_private !== undefined) updates.is_private = is_private
  if (attachments !== undefined) updates.attachments = attachments
  if (is_pinned !== undefined) updates.is_pinned = is_pinned

  let remainingUpdates: Record<string, any> = { ...updates }
  let note: any = null
  let error: any = null

  while (Object.keys(remainingUpdates).length > 0) {
    const attempt = await supabase
      .from('linksy_provider_notes')
      .update(remainingUpdates)
      .eq('id', noteId)
      .select('*')
      .single()

    note = attempt.data
    error = attempt.error

    if (!error) break

    const missingColumn = getMissingColumnName(error.message || '')
    if (!missingColumn || !(missingColumn in remainingUpdates)) {
      break
    }

    delete remainingUpdates[missingColumn]
  }

  if (error) {
    return NextResponse.json(
      {
        error: 'Failed to update note',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    )
  }

  let user: { full_name: string | null; email: string | null } | null = null
  if (note?.user_id) {
    const { data } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', note.user_id)
      .maybeSingle()
    user = data
  } else {
    user = {
      full_name: ((auth.user as any).user_metadata?.full_name as string | null) || null,
      email: auth.user.email || null,
    }
  }

  return NextResponse.json({ ...note, user })
}

/**
 * DELETE /api/providers/[id]/notes/[noteId]
 * Delete an existing note
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { noteId } = params
  const supabase = await createServiceClient()

  // Check note ownership when possible
  const ownerCheck = await supabase
    .from('linksy_provider_notes')
    .select('id, user_id')
    .eq('id', noteId)
    .single()

  let existingNote: any = ownerCheck.data
  let ownerCheckBypassed = false

  if (ownerCheck.error && getMissingColumnName(ownerCheck.error.message || '') === 'user_id') {
    const fallback = await supabase
      .from('linksy_provider_notes')
      .select('id')
      .eq('id', noteId)
      .single()
    existingNote = fallback.data
    ownerCheckBypassed = !fallback.error
  }

  if (!existingNote) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  if (!ownerCheckBypassed && existingNote.user_id !== auth.user.id && !auth.isSiteAdmin) {
    return NextResponse.json(
      { error: 'You can only delete your own notes' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('linksy_provider_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete note',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
