import { useQuery } from '@tanstack/react-query'

/**
 * Hook to check if current user has provider access and get their provider info
 */
export function useProviderAccess() {
  return useQuery({
    queryKey: ['provider-access'],
    queryFn: async () => {
      const res = await fetch('/api/provider-access')
      if (!res.ok) throw new Error('Failed to fetch provider access')
      return res.json()
    },
  })
}
