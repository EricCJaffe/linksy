'use client'

import { useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuditLogFilters as Filters } from '@/lib/api/audit-logs'

interface AuditLogFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

const ACTION_TYPES = [
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deleted', label: 'User Deleted' },
  { value: 'user.invited', label: 'User Invited' },
  { value: 'tenant.created', label: 'Tenant Created' },
  { value: 'tenant.updated', label: 'Tenant Updated' },
  { value: 'tenant.deleted', label: 'Tenant Deleted' },
  { value: 'module.enabled', label: 'Module Enabled' },
  { value: 'module.disabled', label: 'Module Disabled' },
  { value: 'role.changed', label: 'Role Changed' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
]

export function AuditLogFilters({
  filters,
  onFiltersChange,
}: AuditLogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters)

  const handleFilterChange = (key: keyof Filters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
  }

  const handleClear = () => {
    const cleared: Filters = {
      page: 1,
      limit: filters.limit || 50,
    }
    setLocalFilters(cleared)
    onFiltersChange(cleared)
  }

  const hasActiveFilters =
    localFilters.action_type ||
    localFilters.user_id ||
    localFilters.from_date ||
    localFilters.to_date

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="from_date">From Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="from_date"
                type="date"
                value={localFilters.from_date || ''}
                onChange={(e) =>
                  handleFilterChange('from_date', e.target.value || undefined)
                }
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to_date">To Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="to_date"
                type="date"
                value={localFilters.to_date || ''}
                onChange={(e) =>
                  handleFilterChange('to_date', e.target.value || undefined)
                }
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="action_type">Action Type</Label>
          <Select
            value={localFilters.action_type || ''}
            onValueChange={(value) =>
              handleFilterChange('action_type', value || undefined)
            }
          >
            <SelectTrigger id="action_type">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
