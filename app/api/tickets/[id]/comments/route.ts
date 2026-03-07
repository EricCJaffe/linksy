import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { id } = params
  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_ticket_comments')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (!auth.isSiteAdmin) {
    query = query.eq('is_private', false)
  }

  const { data: comments, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json(comments)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { id } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  // Get user profile for author_name
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', auth.user.id)
    .single()

  // Only site admins can create private comments
  const isPrivate = auth.isSiteAdmin && body.is_private === true

  const { data: comment, error: insertError } = await supabase
    .from('linksy_ticket_comments')
    .insert({
      ticket_id: id,
      author_id: auth.user.id,
      content: body.content,
      is_private: isPrivate,
      author_name: profile?.full_name || auth.user.email,
      author_role: profile?.role || auth.user.role,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(comment, { status: 201 })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const body = await request.json()
  const { comment_id, is_private, content } = body

  if (!comment_id) {
    return NextResponse.json({ error: 'comment_id required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Build update object
  const updates: Record<string, any> = {}
  if (typeof is_private === 'boolean') {
    if (!auth.isSiteAdmin) {
      return NextResponse.json({ error: 'Only admins can change privacy' }, { status: 403 })
    }
    updates.is_private = is_private
  }
  if (typeof content === 'string' && content.trim()) {
    // Only author or site admin can edit content
    const { data: existing } = await supabase
      .from('linksy_ticket_comments')
      .select('author_id')
      .eq('id', comment_id)
      .single()

    if (!auth.isSiteAdmin && existing?.author_id !== auth.user.id) {
      return NextResponse.json({ error: 'Only the author or admin can edit' }, { status: 403 })
    }
    updates.content = content.trim()
    updates.updated_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
  }

  const { data: comment, error: updateError } = await supabase
    .from('linksy_ticket_comments')
    .update(updates)
    .eq('id', comment_id)
    .eq('ticket_id', params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(comment)
}
