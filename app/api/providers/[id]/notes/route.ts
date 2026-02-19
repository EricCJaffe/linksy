import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * POST /api/providers/[id]/notes
 * Create a new note for a provider
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId } = params
  const body = await request.json()
  const { note_type, content, is_private = false, attachments } = body

  if (!note_type || !content) {
    return NextResponse.json(
      { error: 'note_type and content are required' },
      { status: 400 }
    )
  }

  if (!['general', 'outreach', 'update', 'internal'].includes(note_type)) {
    return NextResponse.json(
      { error: 'Invalid note_type' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  const { data: note, error } = await supabase
    .from('linksy_provider_notes')
    .insert({
      provider_id: providerId,
      user_id: auth.user.id,
      note_type,
      content,
      is_private,
      ...(attachments !== undefined && { attachments }),
    })
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
