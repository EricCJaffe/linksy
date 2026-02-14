'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Edit2 } from 'lucide-react'
import type { TenantUser } from '@/lib/types/tenant'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const userRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})

type UserRoleInput = z.infer<typeof userRoleSchema>

interface UserEditDialogProps {
  tenantUser: TenantUser
}

export function UserEditDialog({ tenantUser }: UserEditDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: tenantData } = useCurrentTenant()

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserRoleInput>({
    resolver: zodResolver(userRoleSchema),
    defaultValues: {
      role: tenantUser.role,
    },
  })

  const role = watch('role')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setValue('role', tenantUser.role)
    }
  }, [open, tenantUser, setValue])

  const updateUserRole = useMutation({
    mutationFn: async (data: UserRoleInput) => {
      const response = await fetch(`/api/users/${tenantUser.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantData?.tenant.id,
          role: data.role,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user role')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantUsers'] })
      setOpen(false)
    },
  })

  const onSubmit = (data: UserRoleInput) => {
    updateUserRole.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {tenantUser.user?.full_name || tenantUser.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {updateUserRole.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {updateUserRole.error.message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setValue('role', value as 'admin' | 'member')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Administrators can manage users and organization settings
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateUserRole.isPending}>
              {updateUserRole.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
