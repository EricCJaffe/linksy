'use client'

import { Package, CheckCircle2, XCircle } from 'lucide-react'
import type { Module } from '@/lib/types/module'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { REQUIRED_MODULES } from '@/lib/constants/modules'
import { cn } from '@/lib/utils/cn'

interface ModuleCardProps {
  module: Module
  isEnabled?: boolean
  onToggle?: (checked: boolean) => void
  isLoading?: boolean
  showToggle?: boolean
}

export function ModuleCard({
  module,
  isEnabled = false,
  onToggle,
  isLoading = false,
  showToggle = true,
}: ModuleCardProps) {
  const isRequired = REQUIRED_MODULES.includes(module.slug)

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      !module.is_active && 'opacity-60'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border bg-muted p-2">
              <Package className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{module.name}</CardTitle>
              <CardDescription className="text-sm">
                {module.description || 'No description available'}
              </CardDescription>
            </div>
          </div>
          {showToggle && onToggle && (
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={isLoading || isRequired || !module.is_active}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {module.slug}
          </Badge>
          {isRequired && (
            <Badge variant="default" className="text-xs">
              Required
            </Badge>
          )}
          {module.is_active ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-destructive">
              <XCircle className="h-3 w-3" />
              Inactive
            </Badge>
          )}
          {isEnabled && (
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Enabled
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
