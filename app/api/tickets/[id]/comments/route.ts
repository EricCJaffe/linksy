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

  // Only site admins can toggle comment privacy
  if (!auth.isSiteAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { comment_id, is_private } = body

  if (!comment_id || typeof is_private !== 'boolean') {
    return NextResponse.json({ error: 'comment_id and is_private required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: comment, error: updateError } = await supabase
    .from('linksy_ticket_comments')
    .update({ is_private })
    .eq('id', comment_id)
    .eq('ticket_id', params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(comment)
}
