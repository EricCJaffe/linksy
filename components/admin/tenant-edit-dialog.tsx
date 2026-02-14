'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2 } from 'lucide-react'
import { tenantSchema, type TenantInput } from '@/lib/utils/validation'
import type { Tenant } from '@/lib/types/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface TenantEditDialogProps {
  tenant: Tenant
}

export function TenantEditDialog({ tenant }: TenantEditDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TenantInput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: tenant.name,
      slug: tenant.slug,
      address_line1: tenant.address_line1 || '',
      address_line2: tenant.address_line2 || '',
      city: tenant.city || '',
      state: tenant.state || '',
      postal_code: tenant.postal_code || '',
      country: tenant.country || '',
      track_location: tenant.track_location || false,
    },
  })

  const trackLocation = watch('track_location')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        name: tenant.name,
        slug: tenant.slug,
        address_line1: tenant.address_line1 || '',
        address_line2: tenant.address_line2 || '',
        city: tenant.city || '',
        state: tenant.state || '',
        postal_code: tenant.postal_code || '',
        country: tenant.country || '',
        track_location: tenant.track_location || false,
      })
    }
  }, [open, tenant, reset])

  const updateTenant = useMutation({
    mutationFn: async (data: TenantInput) => {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tenant')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenant.id] })
      setOpen(false)
    },
  })

  const onSubmit = (data: TenantInput) => {
    updateTenant.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information and settings.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6 py-4">
              {updateTenant.error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {updateTenant.error.message}
                </div>
              )}

              {/* Organization Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Organization Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    placeholder="Acme Inc"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    placeholder="acme-inc"
                    {...register('slug')}
                    disabled
                  />
                  {errors.slug && (
                    <p className="text-sm text-destructive">{errors.slug.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Slug cannot be changed after creation
                  </p>
                </div>
              </div>

              <Separator />

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Address</h3>
                <div className="space-y-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    placeholder="123 Main Street"
                    {...register('address_line1')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    placeholder="Suite 100"
                    {...register('address_line2')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      {...register('city')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      {...register('state')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      placeholder="10001"
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
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateTenant.isPending}>
              {updateTenant.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
