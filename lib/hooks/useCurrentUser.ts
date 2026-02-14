'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/auth'
import { logger } from '@/lib/utils/logger'

export function useCurrentUser() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return null
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        logger.error('Error fetching user profile', profileError as Error, {
          user_id: user.id
        })
        throw profileError
      }

      return {
        ...user,
        profile: profile as UserProfile,
      }
    },
    retry: false, // Don't retry on failure to avoid infinite loading
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateProfile() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: profile, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
  })
}

export function useSignOut() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
