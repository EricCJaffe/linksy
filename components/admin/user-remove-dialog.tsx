'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import type { TenantUser } from '@/lib/types/tenant'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface UserRemoveDialogProps {
  tenantUser: TenantUser
}

export function UserRemoveDialog({ tenantUser }: UserRemoveDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: tenantData } = useCurrentTenant()

  const removeUser = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${tenantUser.user_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantData?.tenant.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove user')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantUsers'] })
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove User</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this user from your organization?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {removeUser.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {removeUser.error.message}
            </div>
          )}
          <div className="rounded-md border p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">
                  {tenantUser.user?.full_name || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm text-muted-foreground">
                  {tenantUser.user?.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Role:</span>
                <span className="text-sm capitalize">{tenantUser.role}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This user will lose access to the organization but their account will remain active.
            They can be re-invited later.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => removeUser.mutate()}
            disabled={removeUser.isPending}
          >
            {removeUser.isPending ? 'Removing...' : 'Remove User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
