'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useCurrentTenant, useTenantUsers } from '@/lib/hooks/useCurrentTenant'
import { UserInviteDialog } from '@/components/admin/user-invite-dialog'
import { UserEditDialog } from '@/components/admin/user-edit-dialog'
import { UserRemoveDialog } from '@/components/admin/user-remove-dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, CalendarDays, X } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants/roles'

export default function UsersPage() {
  const { data: tenantData, isLoading: tenantLoading } = useCurrentTenant()
  const { data: users, isLoading: usersLoading } = useTenantUsers(tenantData?.tenant?.id)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isLoading = tenantLoading || usersLoading

  const filteredUsers = useMemo(() => {
    if (!users) return []
    return users.filter((membership) => {
      const user = membership.user
      const name = user?.full_name?.toLowerCase() || ''
      const email = user?.email?.toLowerCase() || ''
      const q = search.toLowerCase()

      if (q && !name.includes(q) && !email.includes(q)) return false
      if (roleFilter !== 'all' && membership.role !== roleFilter) return false
      if (dateFrom && membership.created_at < dateFrom) return false
      if (dateTo && membership.created_at > dateTo + 'T23:59:59.999Z') return false

      return true
    })
  }, [users, search, roleFilter, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users in your organization</p>
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
              `${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'}${search || roleFilter !== 'all' || dateFrom || dateTo ? ' matching filters' : ' in your organization'}`
            )}
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-[220px]"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
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
                  {filteredUsers.map((membership) => {
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
              {filteredUsers.length === 0 && (
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
    </div>
  )
}
