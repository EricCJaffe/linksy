import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Validate that a redirect target is a safe relative path.
 * Blocks protocol-relative URLs (//evil.com), absolute URLs, and
 * anything that doesn't start with a single slash.
 */
function safeRedirectPath(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  // Must start with exactly one slash, not two (protocol-relative)
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  // Block backslash tricks (some browsers normalise \ to /)
  if (raw.includes('\\')) return fallback
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'), '/dashboard')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
