'use client'

import { useProviderHierarchy } from '@/lib/hooks/useProviderHierarchy'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Building2, ChevronDown, Network } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ProviderQuickSwitcherProps {
  providerId: string
  providerName?: string
}

export function ProviderQuickSwitcher({ providerId, providerName }: ProviderQuickSwitcherProps) {
  const { data: hierarchy, isLoading } = useProviderHierarchy(providerId)
  const router = useRouter()

  if (isLoading) {
    return null
  }

  if (!hierarchy) {
    return null
  }

  const { provider, parent, children } = hierarchy

  // Only show if part of a hierarchy (has parent or children)
  if (!parent && children.length === 0) {
    return null
  }

  const handleNavigate = (id: string) => {
    router.push(`/dashboard/providers/${id}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Network className="h-4 w-4" />
          {providerName || provider.name}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organization Locations</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Parent */}
        {parent && (
          <>
            <DropdownMenuItem
              onClick={() => handleNavigate(parent.id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{parent.name}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Parent
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Child Locations</DropdownMenuLabel>
          </>
        )}

        {/* Current (if has children - is a parent) */}
        {children.length > 0 && (
          <>
            <DropdownMenuItem
              onClick={() => handleNavigate(provider.id)}
              disabled
              className="flex items-center justify-between bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{provider.name}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Current
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Children */}
        {children.length > 0 && (
          <>
            {children.map((child) => (
              <DropdownMenuItem
                key={child.id}
                onClick={() => handleNavigate(child.id)}
                className={child.id === providerId ? 'bg-muted/50 font-medium' : ''}
              >
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span>{child.name}</span>
                </div>
                {child.id === providerId && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    Current
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Siblings (if has parent) */}
        {parent && children.length === 0 && (
          <>
            {/* We need to fetch siblings - for now just show a note */}
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              View other locations from parent page
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
