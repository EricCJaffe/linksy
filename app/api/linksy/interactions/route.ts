import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/linksy/interactions
 * Log a user interaction (phone click, website click, etc.)
 *
 * Body:
 * - session_id: string (optional)
 * - provider_id: string (required)
 * - interaction_type: 'phone_click' | 'website_click' | 'directions_click' | 'profile_view'
 * - need_id: string (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id, provider_id, interaction_type, need_id } = body

    if (!provider_id || !interaction_type) {
      return NextResponse.json(
        { error: 'provider_id and interaction_type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['phone_click', 'website_click', 'directions_click', 'profile_view']
    if (!validTypes.includes(interaction_type)) {
      return NextResponse.json({ error: 'Invalid interaction_type' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const insert: Record<string, any> = {
      provider_id,
      interaction_type,
    }
    if (session_id) insert.session_id = session_id
    if (need_id) insert.need_id = need_id

    const { error } = await supabase.from('linksy_interactions').insert(insert)

    if (error) {
      console.error('Error logging interaction:', error)
      return NextResponse.json({ error: 'Failed to log interaction' }, { status: 500 })
    }

    // If phone or website click, also update services_clicked on the session
    if (session_id && (interaction_type === 'phone_click' || interaction_type === 'website_click')) {
      supabase.rpc('linksy_add_service_clicked', {
        p_session_id: session_id,
        p_provider_id: provider_id,
      }).then(() => {}).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Interaction tracking error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
