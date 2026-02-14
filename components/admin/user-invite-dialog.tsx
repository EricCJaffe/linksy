'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invitationSchema, type InvitationInput } from '@/lib/utils/validation'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function UserInviteDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: tenantData } = useCurrentTenant()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InvitationInput>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      role: 'member',
    },
  })

  const sendInvitation = useMutation({
    mutationFn: async (data: InvitationInput) => {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tenant_id: tenantData?.tenant.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send invitation')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['tenantUsers'] })
      setOpen(false)
      reset()
    },
  })

  const onSubmit = (data: InvitationInput) => {
    sendInvitation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new user to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {sendInvitation.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {sendInvitation.error.message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                defaultValue="member"
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
                Administrators can manage users and settings
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
            <Button type="submit" disabled={sendInvitation.isPending}>
              {sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
