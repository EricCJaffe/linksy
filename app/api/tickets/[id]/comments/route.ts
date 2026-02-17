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

  const { data: comment, error: insertError } = await supabase
    .from('linksy_ticket_comments')
    .insert({
      ticket_id: id,
      author_id: auth.user.id,
      content: body.content,
      is_private: body.is_private || false,
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
