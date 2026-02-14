'use client'

import { useModules } from '@/lib/hooks/useModules'
import { ModuleCard } from '@/components/admin/module-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Info } from 'lucide-react'

export function ModulesTab() {
  const { data: modules, isLoading } = useModules()

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Platform Modules</h2>
        <p className="text-sm text-muted-foreground">
          Manage available modules across the entire platform
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Platform Module Management
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Modules must be active at the platform level before tenants can enable them.
              Use the Tenants tab to manage module access for specific organizations.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Modules</CardTitle>
          <CardDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `${modules?.length || 0} module${modules?.length === 1 ? '' : 's'} available`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : modules && modules.length > 0 ? (
              modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isEnabled={module.is_active}
                  showToggle={false}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No modules found</p>
                <p className="text-sm text-muted-foreground">
                  Contact system administrator to set up modules
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Management</CardTitle>
          <CardDescription>
            How modules work on the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">Platform-wide modules</h4>
            <p className="text-muted-foreground">
              Modules must be active at the platform level before tenants can enable them.
              Inactive modules cannot be enabled by any tenant.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Tenant enablement</h4>
            <p className="text-muted-foreground">
              Once a module is active platform-wide, each tenant can choose whether to enable
              it for their organization. Use the Tenants tab to manage per-tenant module access.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Required modules</h4>
            <p className="text-muted-foreground">
              Core modules marked as "Required" are automatically enabled for all tenants and
              provide essential platform functionality.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
