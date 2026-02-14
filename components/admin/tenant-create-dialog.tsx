'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTenantSchema, type CreateTenantInput } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

export function TenantCreateDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      track_location: false,
    },
  })

  const name = watch('name')
  const trackLocation = watch('track_location')

  const createTenant = useMutation({
    mutationFn: async (data: CreateTenantInput) => {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create tenant')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setOpen(false)
      reset()
    },
  })

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setValue('name', value)
    setValue('slug', generateSlug(value))
  }

  const onSubmit = (data: CreateTenantInput) => {
    createTenant.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Tenant</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Set up a new organization with an admin user who will manage the account.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6 py-4">
              {createTenant.error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {createTenant.error.message}
                </div>
              )}

              {/* Organization Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Organization Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      placeholder="Acme Inc"
                      {...register('name')}
                      onChange={handleNameChange}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      placeholder="acme-inc"
                      {...register('slug')}
                    />
                    {errors.slug && (
                      <p className="text-sm text-destructive">{errors.slug.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Used in URLs and must be unique
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Address (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address_line1">Address Line 1</Label>
                    <Input
                      id="address_line1"
                      placeholder="123 Main St"
                      {...register('address_line1')}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address_line2">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      placeholder="Suite 100"
                      {...register('address_line2')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="San Francisco"
                      {...register('city')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      placeholder="CA"
                      {...register('state')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      placeholder="94102"
                      {...register('postal_code')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="United States"
                      {...register('country')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Primary Admin */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Primary Administrator *</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="admin_name">Full Name</Label>
                    <Input
                      id="admin_name"
                      placeholder="John Doe"
                      {...register('admin_name')}
                    />
                    {errors.admin_name && (
                      <p className="text-sm text-destructive">{errors.admin_name.message}</p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="admin_email">Email Address</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      placeholder="admin@acme.com"
                      {...register('admin_email')}
                    />
                    {errors.admin_email && (
                      <p className="text-sm text-destructive">{errors.admin_email.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      An invitation will be sent to this email
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Settings</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="track_location"
                    checked={trackLocation}
                    onCheckedChange={(checked) => setValue('track_location', checked as boolean)}
                  />
                  <Label
                    htmlFor="track_location"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Enable location tracking features
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, this organization can track user locations and access location-based features
                </p>
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={createTenant.isPending}>
            {createTenant.isPending ? 'Creating...' : 'Create Tenant & Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
