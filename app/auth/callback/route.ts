import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /auth/callback
 * Handles:
 * - OAuth redirects from Google and Microsoft (code parameter)
 * - Invite links (token_hash parameter from Supabase verify endpoint)
 * - Password recovery links
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Handle OAuth callback (Google/Microsoft)
  if (code) {
    console.log('[auth/callback] received code', { hasCode: Boolean(code), next })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user needs to set password (invited user)
      const { data: { user } } = await supabase.auth.getUser()

      // If user was invited (has raw_user_meta_data.contact_id), redirect to set password
      if (user?.user_metadata?.contact_id) {
        return NextResponse.redirect(`${origin}/auth/set-password?from=invite`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
    console.log('[auth/callback] exchange error', { message: error?.message })
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  // Handle magic link from invite (token_hash from Supabase verify endpoint)
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type === 'recovery' ? 'recovery' : type === 'email' ? 'email' : 'invite',
    })

    if (!error) {
      // After successful verification, redirect to password setup for invites
      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/set-password?from=${type}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    return NextResponse.redirect(`${origin}/login?error=verification_failed`)
  }

  // No parameters - check if user has active session (from invite magic link)
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is logged in - check if they were invited and need to set password
    if (user.user_metadata?.contact_id) {
      // User was invited as a contact - redirect to set password
      return NextResponse.redirect(`${origin}/auth/set-password?from=invite`)
    }
    // User is logged in and set up - go to dashboard
    return NextResponse.redirect(`${origin}${next}`)
  }

  // No session - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
