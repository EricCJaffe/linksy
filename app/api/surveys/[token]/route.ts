import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/surveys/[token]
 * Public endpoint: Get survey by token (no auth required)
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = await createServiceClient()

  const { data: survey, error: fetchError } = await supabase
    .from('linksy_surveys')
    .select('id, token, ticket_id, rating, feedback_text, completed_at, created_at')
    .eq('token', params.token)
    .single()

  if (fetchError || !survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  return NextResponse.json(survey)
}

/**
 * PATCH /api/surveys/[token]
 * Public endpoint: Submit survey response (no auth required, token-based)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { token: string } }
) {
  const body = await request.json()
  const { rating, feedback_text } = body

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Check survey exists and isn't already completed
  const { data: existing } = await supabase
    .from('linksy_surveys')
    .select('id, completed_at')
    .eq('token', params.token)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  if (existing.completed_at) {
    return NextResponse.json({ error: 'Survey already completed' }, { status: 400 })
  }

  const { data: survey, error: updateError } = await supabase
    .from('linksy_surveys')
    .update({
      rating,
      feedback_text: feedback_text || null,
      completed_at: new Date().toISOString(),
    })
    .eq('token', params.token)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(survey)
}
