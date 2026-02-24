import { useQuery } from '@tanstack/react-query'

interface ProviderInfo {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  description: string | null
  is_active: boolean
  accepting_referrals: boolean
  role: 'admin' | 'user'
}

interface ReferralStats {
  total: number
  pending: number
  in_progress: number
  resolved: number
  closed: number
  thisMonth: number
}

interface MyProviderStatsResponse {
  hasAccess: boolean
  provider: ProviderInfo | null
  orgStats: ReferralStats | null
  personalStats: ReferralStats | null
}

/**
 * Hook to get provider user's organization info and stats
 */
export function useMyProviderStats() {
  return useQuery<MyProviderStatsResponse>({
    queryKey: ['my-provider-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats/my-provider')
      if (!res.ok) throw new Error('Failed to fetch provider stats')
      return res.json()
    },
  })
}
