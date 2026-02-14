'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { TenantCreateDialog } from '@/components/admin/tenant-create-dialog'
import { TenantEditDialog } from '@/components/admin/tenant-edit-dialog'
import { TenantDeleteDialog } from '@/components/admin/tenant-delete-dialog'
import type { Tenant } from '@/lib/types/tenant'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export default function TenantsPage() {
  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await fetch('/api/tenants')
      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }
      return response.json()
    },
  })

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
              `${tenants?.length || 0} tenant${tenants?.length === 1 ? '' : 's'} on the platform`
            )}
          </CardDescription>
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
                  {tenants?.map((tenant) => {
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
                          <Badge variant="outline">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TenantEditDialog tenant={tenant} />
                            <TenantDeleteDialog tenant={tenant} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!tenants || tenants.length === 0) && (
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
