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
  const { note_type, content, is_private = false, attachments, call_log_data } = body

  if (!note_type || !content) {
    return NextResponse.json(
      { error: 'note_type and content are required' },
      { status: 400 }
    )
  }

  if (!['general', 'outreach', 'update', 'internal', 'call_log'].includes(note_type)) {
    return NextResponse.json(
      { error: 'Invalid note_type' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Check if user has access to this provider (including via parent relationship)
  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    const { data: hasAccess } = await supabase.rpc(
      'linksy_user_can_access_provider',
      {
        p_user_id: auth.user.id,
        p_provider_id: providerId,
      }
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  const insertPayloads: Record<string, any>[] = [
    // Prefer author_id first (current schema), then user_id for legacy compatibility.
    {
      provider_id: providerId,
      author_id: auth.user.id,
      note_type,
      content,
      is_private,
      ...(attachments !== undefined && { attachments }),
      ...(call_log_data !== undefined && { call_log_data }),
    },
    {
      provider_id: providerId,
      user_id: auth.user.id,
      note_type,
      content,
      is_private,
      ...(attachments !== undefined && { attachments }),
      ...(call_log_data !== undefined && { call_log_data }),
    },
    {
      provider_id: providerId,
      author_id: auth.user.id,
      note_type,
      content,
      ...(call_log_data !== undefined && { call_log_data }),
    },
    {
      provider_id: providerId,
      note_type,
      content,
      ...(call_log_data !== undefined && { call_log_data }),
    },
    {
      provider_id: providerId,
      user_id: auth.user.id,
      note_type,
      content,
      ...(call_log_data !== undefined && { call_log_data }),
    },
  ]

  let note: any = null
  let error: any = null

  const isCompatibleFallbackError = (message: string) =>
    /could not find the '.*' column/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /null value in column .*author_id/i.test(message) ||
    /violates not-null constraint.*author_id/i.test(message) ||
    /null value in column .*user_id/i.test(message) ||
    /violates not-null constraint.*user_id/i.test(message)

  for (let i = 0; i < insertPayloads.length; i += 1) {
    const payload = insertPayloads[i]
    const attempt = await supabase
      .from('linksy_provider_notes')
      .insert(payload)
      .select('*')
      .single()

    note = attempt.data
    error = attempt.error

    if (!error) break

    const message = error.message || ''
    const isLastAttempt = i === insertPayloads.length - 1
    if (isLastAttempt || !isCompatibleFallbackError(message)) {
      break
    }
  }

  if (error) {
    return NextResponse.json(
      {
        error: 'Failed to create note',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    )
  }

  let user: { full_name: string | null; email: string | null } | null = null
  const noteUserId = note?.author_id ?? note?.user_id
  if (noteUserId) {
    const { data } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', noteUserId)
      .maybeSingle()
    user = data
  } else if (note?.author_name) {
    user = { full_name: note.author_name, email: null }
  } else {
    user = {
      full_name: ((auth.user as any).user_metadata?.full_name as string | null) || null,
      email: auth.user.email || null,
    }
  }

  return NextResponse.json({ ...note, user })
}
