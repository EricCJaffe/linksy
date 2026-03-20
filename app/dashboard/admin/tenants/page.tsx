'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { TenantCreateDialog } from '@/components/admin/tenant-create-dialog'
import { TenantEditDialog } from '@/components/admin/tenant-edit-dialog'
import { TenantDeleteDialog } from '@/components/admin/tenant-delete-dialog'
import type { Tenant } from '@/lib/types/tenant'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, CalendarDays, X } from 'lucide-react'

export default function TenantsPage() {
  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await fetch('/api/tenants?type=region&include_archived=true')
      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }
      return response.json()
    },
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredTenants = useMemo(() => {
    if (!tenants) return []
    return tenants.filter((tenant) => {
      const q = search.toLowerCase()
      const name = tenant.name?.toLowerCase() || ''
      const slug = tenant.slug?.toLowerCase() || ''
      const location = [tenant.city, tenant.state, tenant.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (q && !name.includes(q) && !slug.includes(q) && !location.includes(q)) return false
      if (statusFilter === 'active' && tenant.is_active === false) return false
      if (statusFilter === 'archived' && tenant.is_active !== false) return false
      if (dateFrom && tenant.created_at < dateFrom) return false
      if (dateTo && tenant.created_at > dateTo + 'T23:59:59.999Z') return false

      return true
    })
  }, [tenants, search, statusFilter, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">Manage all tenants on the platform</p>
        </div>
        <TenantCreateDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `${filteredTenants.length} tenant${filteredTenants.length === 1 ? '' : 's'}${search || statusFilter !== 'all' || dateFrom || dateTo ? ' matching filters' : ' on the platform'}`
            )}
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, slug, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-[260px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
              aria-label="From date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
              aria-label="To date"
            />
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear dates
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  {filteredTenants.map((tenant) => {
                    const location = [tenant.city, tenant.state, tenant.country]
                      .filter(Boolean)
                      .join(', ') || 'Not specified'

                    return (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {location}
                        </TableCell>
                        <TableCell>
                          {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {tenant.is_active === false ? (
                            <Badge variant="secondary">Archived</Badge>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TenantEditDialog tenant={tenant} />
                            {tenant.is_active !== false && (
                              <TenantDeleteDialog tenant={tenant} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredTenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No tenants found
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
