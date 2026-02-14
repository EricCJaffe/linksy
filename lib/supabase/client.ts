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

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
