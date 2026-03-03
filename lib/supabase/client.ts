import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

/**
 * Browser-side Supabase client with singleton pattern.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * @returns Supabase client instance
 */
export function createClient() {
  if (client) {
    return client
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  client = createBrowserClient<Database>(url, anonKey)

  return client
}
