import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * POST /api/support-tickets/[id]/comments
 * Add comment to support ticket
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: ticketId } = params
  const body = await request.json()
  const { content, is_internal } = body

  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', auth.user.id)
    .single()

  const { data: comment, error } = await supabase
    .from('linksy_support_ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_id: auth.user.id,
      author_name: user?.full_name || user?.email || 'Unknown',
      content: content.trim(),
      is_internal: is_internal || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(comment, { status: 201 })
}
