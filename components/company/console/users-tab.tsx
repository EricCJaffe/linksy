'use client'

import { format } from 'date-fns'
import { useCurrentTenant, useTenantUsers } from '@/lib/hooks/useCurrentTenant'
import { UserInviteDialog } from '@/components/admin/user-invite-dialog'
import { UserEditDialog } from '@/components/admin/user-edit-dialog'
import { UserRemoveDialog } from '@/components/admin/user-remove-dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { ROLE_LABELS } from '@/lib/constants/roles'

export function UsersTab() {
  const { data: tenantData, isLoading: tenantLoading } = useCurrentTenant()
  const { data: users, isLoading: usersLoading } = useTenantUsers(tenantData?.tenant?.id)

  const isLoading = tenantLoading || usersLoading

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage users in your organization</p>
        </div>
        <UserInviteDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `${users?.length || 0} user${users?.length === 1 ? '' : 's'} in your organization`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  {users?.map((membership) => {
                const user = membership.user
                const initials = user?.full_name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase() || user?.email?.[0].toUpperCase() || '?'

                return (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user?.avatar_url || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {user?.full_name || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{user?.email}</TableCell>
                    <TableCell>
                      <Badge variant={membership.role === 'admin' ? 'default' : 'secondary'}>
                        {ROLE_LABELS[membership.role] || membership.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(membership.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <UserEditDialog tenantUser={membership} />
                        <UserRemoveDialog tenantUser={membership} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!users || users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
