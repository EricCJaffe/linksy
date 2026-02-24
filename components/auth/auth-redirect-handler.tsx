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
    const hash = window.location.hash

    // IMMEDIATELY redirect if hash contains invite/recovery type
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      console.log('Detected invite/recovery in hash, redirecting...')
      window.location.href = '/auth/set-password' + hash
      return
    }

    // Otherwise, normal auth flow
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return

      if (session.user.user_metadata?.contact_id) {
        router.push('/auth/set-password?from=invite')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.push('/dashboard')
      }
    })

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
