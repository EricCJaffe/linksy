'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCurrentTenant, useUpdateTenant } from '@/lib/hooks/useCurrentTenant'
import { tenantSchema, type TenantInput } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CompanyTab() {
  const { data: tenantData, isLoading } = useCurrentTenant()
  const { mutate: updateTenant, isPending, error } = useUpdateTenant()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TenantInput>({
    resolver: zodResolver(tenantSchema),
    values: {
      name: tenantData?.tenant?.name || '',
      slug: tenantData?.tenant?.slug || '',
      address_line1: tenantData?.tenant?.address_line1 || '',
      address_line2: tenantData?.tenant?.address_line2 || '',
      city: tenantData?.tenant?.city || '',
      state: tenantData?.tenant?.state || '',
      postal_code: tenantData?.tenant?.postal_code || '',
      country: tenantData?.tenant?.country || '',
      track_location: tenantData?.tenant?.track_location || false,
    },
  })

  const trackLocation = watch('track_location')

  const onSubmit = (data: TenantInput) => {
    if (!tenantData?.tenant?.id) return

    updateTenant({
      id: tenantData.tenant.id,
      ...data,
    })
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Company Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your organization details and address
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Update your organization name and identifier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error.message}
              </div>
            )}
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
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
            <CardDescription>
              Manage your organization's physical address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>
              Configure features for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="track_location"
                checked={trackLocation}
                onCheckedChange={(checked) => setValue('track_location', checked as boolean, { shouldDirty: true })}
              />
              <Label
                htmlFor="track_location"
                className="text-sm font-normal cursor-pointer"
              >
                Enable location tracking features
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, location-based features will be available throughout the application
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !isDirty}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </>
  )
}
