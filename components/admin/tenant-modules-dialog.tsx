'use client'

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { useModules } from '@/lib/hooks/useModules'
import type { Tenant } from '@/lib/types/tenant'
import { REQUIRED_MODULES } from '@/lib/constants/modules'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

interface TenantModulesDialogProps {
  tenant: Tenant
}

export function TenantModulesDialog({ tenant }: TenantModulesDialogProps) {
  const [open, setOpen] = useState(false)
  const { data: modules, isLoading } = useModules()
  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    new Set(tenant.settings?.enabled_modules || [])
  )
  const [isSaving, setIsSaving] = useState(false)

  const toggleModule = (moduleId: string) => {
    const newEnabled = new Set(enabledModules)
    if (newEnabled.has(moduleId)) {
      newEnabled.delete(moduleId)
    } else {
      newEnabled.add(moduleId)
    }
    setEnabledModules(newEnabled)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...tenant.settings,
            enabled_modules: Array.from(enabledModules),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update modules')
      }

      setOpen(false)
    } catch (error) {
      logger.error('Failed to save modules', error instanceof Error ? error : new Error('Unknown error'), {
        tenant_id: tenant.id,
        enabled_modules: Array.from(enabledModules)
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Manage Modules">
          <Layers className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Module Access - {tenant.name}</DialogTitle>
          <DialogDescription>
            Enable or disable modules for this organization. Only modules active at the platform level can be enabled.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : modules && modules.length > 0 ? (
              modules.map((module) => {
                const isEnabled = enabledModules.has(module.id)
                const isPlatformActive = module.is_active
                const isRequired = REQUIRED_MODULES.includes(module.slug)

                return (
                  <Card key={module.id} className={!isPlatformActive ? 'opacity-50' : ''}>
                    <CardContent className="flex items-start justify-between gap-4 pt-6">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`module-${module.id}`}
                            className="text-base font-medium cursor-pointer"
                          >
                            {module.name}
                          </Label>
                          {isRequired && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {!isPlatformActive && (
                            <Badge variant="outline" className="text-xs">
                              Platform Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {module.description || 'No description available'}
                        </p>
                      </div>
                      <Switch
                        id={`module-${module.id}`}
                        checked={isRequired || isEnabled}
                        onCheckedChange={() => toggleModule(module.id)}
                        disabled={!isPlatformActive || isRequired}
                      />
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No modules available
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
