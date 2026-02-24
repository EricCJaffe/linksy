'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Client component that handles auth redirects for users landing
 * with session tokens in URL hash (from invite/recovery links)
 */
export function AuthRedirectHandler() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Listen for auth state changes (when Supabase processes hash tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return

      // Check if user was invited (has contact_id metadata) and needs to set password
      if (session.user.user_metadata?.contact_id) {
        router.push('/auth/set-password?from=invite')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Regular user logged in - go to dashboard
        router.push('/dashboard')
      }
    })

    // Also check immediately in case session already exists
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.contact_id) {
        router.push('/auth/set-password?from=invite')
      } else if (user) {
        router.push('/dashboard')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // This component doesn't render anything
  return null
}
