'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import type { Tenant } from '@/lib/types/tenant'
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

interface TenantDeleteDialogProps {
  tenant: Tenant
}

export function TenantDeleteDialog({ tenant }: TenantDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const deleteTenant = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete tenant')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
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
          <DialogTitle>Delete Tenant</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this tenant? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {deleteTenant.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {deleteTenant.error.message}
            </div>
          )}
          <div className="rounded-md border p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Tenant:</span>
                <span className="text-sm">{tenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Slug:</span>
                <span className="text-sm text-muted-foreground">{tenant.slug}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            All users, data, and settings associated with this tenant will be permanently deleted.
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
            onClick={() => deleteTenant.mutate()}
            disabled={deleteTenant.isPending}
          >
            {deleteTenant.isPending ? 'Deleting...' : 'Delete Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
