'use client'

import { Check, ChevronsUpDown, Building2 } from 'lucide-react'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { useTenantSwitcher } from '@/lib/hooks/useTenantSwitcher'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function OrgSwitcher() {
  const { data: tenantData, isLoading } = useCurrentTenant()
  const { switchTenant } = useTenantSwitcher()

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Loading...
        </span>
      </Button>
    )
  }

  if (!tenantData || !tenantData.memberships || tenantData.memberships.length === 0) {
    return null
  }

  const currentTenant = tenantData.tenant
  const memberships = tenantData.memberships

  if (memberships.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{currentTenant.name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentTenant.name}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((membership: { tenant: { id: string; name: string }; role: string }) => (
          <DropdownMenuItem
            key={membership.tenant.id}
            onClick={() => switchTenant(membership.tenant.id)}
            className="cursor-pointer"
          >
            <Check
              className={cn(
                'mr-2 h-4 w-4',
                membership.tenant.id === currentTenant.id
                  ? 'opacity-100'
                  : 'opacity-0'
              )}
            />
            <span className="truncate">{membership.tenant.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
