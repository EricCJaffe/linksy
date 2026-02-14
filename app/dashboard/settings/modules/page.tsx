'use client'

import { useModules, useTenantModules, useToggleTenantModule } from '@/lib/hooks/useModules'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { ModuleCard } from '@/components/admin/module-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

export default function ModulesSettingsPage() {
  const { data: tenantData, isLoading: tenantLoading } = useCurrentTenant()
  const { data: allModules, isLoading: modulesLoading } = useModules()
  const { data: tenantModules, isLoading: tenantModulesLoading } = useTenantModules(
    tenantData?.tenant?.id
  )
  const { mutate: toggleModule, isPending } = useToggleTenantModule()

  const isLoading = tenantLoading || modulesLoading || tenantModulesLoading

  // Create a map of enabled modules for quick lookup
  const enabledModulesMap = new Map(
    tenantModules?.map((tm) => [tm.module_id, tm.is_enabled]) || []
  )

  const handleToggle = (moduleId: string, checked: boolean) => {
    if (!tenantData?.tenant?.id) return

    toggleModule({
      tenantId: tenantData.tenant.id,
      moduleId,
      isEnabled: checked,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modules</h1>
        <p className="text-muted-foreground">
          Enable or disable modules for your organization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Modules</CardTitle>
          <CardDescription>
            Control which features are available to your users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : allModules && allModules.length > 0 ? (
              allModules.map((module) => {
                const isEnabled = enabledModulesMap.get(module.id) || false

                return (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    isEnabled={isEnabled}
                    onToggle={(checked) => handleToggle(module.id, checked)}
                    isLoading={isPending}
                    showToggle={true}
                  />
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No modules available</p>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator to enable modules
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Modules</CardTitle>
          <CardDescription>
            Understanding the module system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">What are modules?</h4>
            <p className="text-muted-foreground">
              Modules are feature packages that can be enabled or disabled to customize your
              organization's experience. Enable only the features you need.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Required modules</h4>
            <p className="text-muted-foreground">
              Some modules are marked as "Required" and cannot be disabled. These provide core
              functionality essential for the platform.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Module status</h4>
            <p className="text-muted-foreground">
              "Active" modules are available on the platform. "Inactive" modules have been
              disabled by the site administrator and cannot be enabled.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
