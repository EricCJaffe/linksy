import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /auth/callback
 * Handles:
 * - OAuth redirects from Google and Microsoft (code parameter)
 * - Invite links (token + type=invite parameters)
 * - Password recovery links (token + type=recovery parameters)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Handle OAuth callback (Google/Microsoft)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  // Handle invite link - redirect to password setup
  if (token && type === 'invite') {
    return NextResponse.redirect(`${origin}/auth/set-password?token=${token}&type=invite`)
  }

  // Handle password recovery
  if (token && type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/set-password?token=${token}&type=recovery`)
  }

  // No valid parameters - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
