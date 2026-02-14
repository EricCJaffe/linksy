'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

const CURRENT_TENANT_KEY = 'currentTenantId'

export function useTenantSwitcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const switchTenant = useCallback((tenantId: string) => {
    if (typeof window === 'undefined') return

    localStorage.setItem(CURRENT_TENANT_KEY, tenantId)

    // Invalidate all tenant-related queries
    queryClient.invalidateQueries({ queryKey: ['currentTenant'] })
    queryClient.invalidateQueries({ queryKey: ['tenantUsers'] })
    queryClient.invalidateQueries({ queryKey: ['tenantModules'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })

    // Redirect to dashboard
    router.push('/dashboard')
  }, [queryClient, router])

  const getCurrentTenantId = useCallback(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CURRENT_TENANT_KEY)
  }, [])

  return {
    switchTenant,
    getCurrentTenantId,
  }
}
