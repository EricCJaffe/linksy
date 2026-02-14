'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Module, TenantModule } from '@/lib/types/module'

export function useModules() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        throw error
      }

      return data as Module[]
    },
  })
}

export function useTenantModules(tenantId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['tenantModules', tenantId],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('tenant_modules')
        .select(`
          *,
          module:modules(*)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_enabled', true)

      if (error) {
        throw error
      }

      return data as TenantModule[]
    },
    enabled: !!tenantId,
  })
}

export function useToggleTenantModule() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tenantId,
      moduleId,
      isEnabled,
    }: {
      tenantId: string
      moduleId: string
      isEnabled: boolean
    }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('tenant_modules')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('module_id', moduleId)
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('tenant_modules')
          .update({ is_enabled: isEnabled })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('tenant_modules')
          .insert({
            tenant_id: tenantId,
            module_id: moduleId,
            is_enabled: isEnabled,
          })

        if (error) throw error
      }
    },
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['tenantModules', tenantId] })
    },
  })
}

export function useIsModuleEnabled(moduleSlug: string, tenantId?: string) {
  const { data: modules } = useTenantModules(tenantId)

  if (!modules) return false

  return modules.some(
    tm => tm.module?.slug === moduleSlug && tm.is_enabled
  )
}

/**
 * Get only the enabled modules for the current tenant
 * Returns the actual Module objects, not TenantModule
 */
export function useEnabledModules(tenantId?: string) {
  const { data: tenantModules, isLoading, error } = useTenantModules(tenantId)

  const enabledModules = tenantModules
    ?.filter(tm => tm.is_enabled && tm.module)
    .map(tm => tm.module as Module) || []

  return {
    data: enabledModules,
    isLoading,
    error,
  }
}

/**
 * Get modules accessible by a specific user in a tenant
 * This is future-ready for user-level module permissions
 */
export function useUserModules(tenantId?: string, userId?: string) {
  // For now, return all enabled tenant modules
  // In the future, this can be enhanced to check user-specific permissions
  return useEnabledModules(tenantId)
}
