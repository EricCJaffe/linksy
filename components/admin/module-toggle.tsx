'use client'

import { useToggleTenantModule } from '@/lib/hooks/useModules'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Module } from '@/lib/types/module'
import { REQUIRED_MODULES } from '@/lib/constants/modules'

interface ModuleToggleProps {
  module: Module
  tenantId: string
  isEnabled: boolean
}

export function ModuleToggle({ module, tenantId, isEnabled }: ModuleToggleProps) {
  const { mutate: toggleModule, isPending } = useToggleTenantModule()

  const isRequired = REQUIRED_MODULES.includes(module.slug)

  const handleToggle = (checked: boolean) => {
    toggleModule({
      tenantId,
      moduleId: module.id,
      isEnabled: checked,
    })
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label htmlFor={`module-${module.id}`} className="text-base">
          {module.name}
        </Label>
        {module.description && (
          <p className="text-sm text-muted-foreground">{module.description}</p>
        )}
        {isRequired && (
          <p className="text-xs text-muted-foreground">Required module</p>
        )}
      </div>
      <Switch
        id={`module-${module.id}`}
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isPending || isRequired}
      />
    </div>
  )
}
