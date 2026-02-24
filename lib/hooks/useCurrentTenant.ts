'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Tenant, TenantUser } from '@/lib/types/tenant'
import { logger } from '@/lib/utils/logger'

const CURRENT_TENANT_KEY = 'currentTenantId'

function getCurrentTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CURRENT_TENANT_KEY)
}

function setCurrentTenantId(tenantId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CURRENT_TENANT_KEY, tenantId)
}

export function useCurrentTenant() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['currentTenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return null
      }

      const currentTenantId = getCurrentTenantId()

      // Get user's tenant memberships with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tenant query timeout')), 3000)
      )

      const queryPromise = supabase
        .from('tenant_users')
        .select(`
          *,
          tenant:tenants(*)
        `)
        .eq('user_id', user.id)

      const { data: memberships, error: membershipError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]).catch((err) => {
        logger.warn('Tenant query failed or timed out', {
          user_id: user.id,
          error: err.message
        })
        return { data: null, error: err }
      }) as { data: any, error: any }

      if (membershipError) {
        logger.warn('Error fetching tenant memberships (non-critical for provider users)', {
          user_id: user.id,
          error: membershipError.message
        })
        // Return null instead of throwing - provider users don't need tenants
        return null
      }

      if (!memberships || memberships.length === 0) {
        logger.warn('User has no tenant memberships', { user_id: user.id })
        return null
      }

      // Find the current tenant or use the first one
      let currentMembership = memberships.find((m: any) => m.tenant_id === currentTenantId)

      if (!currentMembership) {
        currentMembership = memberships[0]
        setCurrentTenantId(currentMembership.tenant_id)
      }

      return {
        tenant: currentMembership.tenant as Tenant,
        role: currentMembership.role as 'admin' | 'member',
        memberships: memberships.map((m: any) => ({
          tenant: m.tenant as Tenant,
          role: m.role as 'admin' | 'member',
        })),
      }
    },
    retry: false, // Don't retry on failure to avoid infinite loading
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  })
}

export function useTenantUsers(tenantId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['tenantUsers', tenantId],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          *,
          user:users(*)
        `)
        .eq('tenant_id', tenantId)

      if (error) {
        throw error
      }

      return data as TenantUser[]
    },
    enabled: !!tenantId,
  })
}

export function useUpdateTenant() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Tenant> & { id: string }) => {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return tenant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTenant'] })
    },
  })
}
