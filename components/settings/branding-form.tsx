'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCurrentTenant, useUpdateTenant } from '@/lib/hooks/useCurrentTenant'
import { brandingSchema, type BrandingInput } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from '@/components/ui/image-upload'
import { uploadLogo } from '@/lib/storage/upload'

export function BrandingForm() {
  const { data: tenantData, isLoading } = useCurrentTenant()
  const { mutate: updateTenant, isPending, error } = useUpdateTenant()

  const branding = tenantData?.tenant?.branding || {}

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<BrandingInput>({
    resolver: zodResolver(brandingSchema),
    values: {
      logo_url: branding.logo_url || undefined,
      favicon_url: branding.favicon_url || undefined,
      primary_color: branding.primary_color || '#000000',
      secondary_color: branding.secondary_color || '#ffffff',
      font_family: branding.font_family || '',
    },
  })

  const logoUrl = watch('logo_url')
  const primaryColor = watch('primary_color')
  const secondaryColor = watch('secondary_color')
  const fontFamily = watch('font_family')

  const onSubmit = (data: BrandingInput) => {
    if (!tenantData?.tenant?.id) return

    updateTenant({
      id: tenantData.tenant.id,
      branding: data,
    })
  }

  const handleLogoUpload = async (file: File) => {
    if (!tenantData?.tenant?.id) throw new Error('Tenant not found')
    const url = await uploadLogo(file, tenantData.tenant.id)
    setValue('logo_url', url, { shouldDirty: true })
    return url
  }

  const handleFaviconUpload = async (file: File) => {
    if (!tenantData?.tenant?.id) throw new Error('Tenant not found')
    const url = await uploadLogo(file, tenantData.tenant.id)
    setValue('favicon_url', url, { shouldDirty: true })
    return url
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the look and feel of your organization
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error.message}
              </div>
            )}

            <div className="space-y-2">
              <Label>Logo</Label>
              <ImageUpload
                value={logoUrl}
                onChange={(url) => setValue('logo_url', url, { shouldDirty: true })}
                onRemove={() => setValue('logo_url', undefined, { shouldDirty: true })}
                disabled={isPending}
                uploadFn={handleLogoUpload}
              />
              <p className="text-xs text-muted-foreground">
                Recommended size: 200x50px (PNG or SVG)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Favicon</Label>
              <ImageUpload
                value={watch('favicon_url')}
                onChange={(url) => setValue('favicon_url', url, { shouldDirty: true })}
                onRemove={() => setValue('favicon_url', undefined, { shouldDirty: true })}
                disabled={isPending}
                uploadFn={handleFaviconUpload}
              />
              <p className="text-xs text-muted-foreground">
                Recommended size: 32x32px (PNG or ICO)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={primaryColor}
                    onChange={(e) => setValue('primary_color', e.target.value, { shouldDirty: true })}
                  />
                  <Input
                    placeholder="#000000"
                    value={primaryColor}
                    onChange={(e) => setValue('primary_color', e.target.value, { shouldDirty: true })}
                  />
                </div>
                {errors.primary_color && (
                  <p className="text-sm text-destructive">{errors.primary_color.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={secondaryColor}
                    onChange={(e) => setValue('secondary_color', e.target.value, { shouldDirty: true })}
                  />
                  <Input
                    placeholder="#ffffff"
                    value={secondaryColor}
                    onChange={(e) => setValue('secondary_color', e.target.value, { shouldDirty: true })}
                  />
                </div>
                {errors.secondary_color && (
                  <p className="text-sm text-destructive">{errors.secondary_color.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font_family">Font Family</Label>
              <Input
                id="font_family"
                placeholder="Inter, sans-serif"
                {...register('font_family')}
              />
              {errors.font_family && (
                <p className="text-sm text-destructive">{errors.font_family.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use Google Fonts or system fonts
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your branding looks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 rounded-lg border p-6">
            <div className="flex items-center justify-between">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-12 max-w-[200px] object-contain"
                />
              ) : (
                <div className="flex h-12 w-32 items-center justify-center rounded border-2 border-dashed bg-muted text-xs text-muted-foreground">
                  Your Logo
                </div>
              )}
              {watch('favicon_url') && (
                <img
                  src={watch('favicon_url') || ''}
                  alt="Favicon preview"
                  className="h-8 w-8 rounded"
                />
              )}
            </div>

            <div className="space-y-2">
              <div
                className="rounded-lg p-4 text-center font-medium text-white"
                style={{
                  backgroundColor: primaryColor || '#000000',
                  fontFamily: fontFamily || 'inherit',
                }}
              >
                Primary Button
              </div>
              <div
                className="rounded-lg border-2 p-4 text-center font-medium"
                style={{
                  borderColor: secondaryColor || '#ffffff',
                  color: secondaryColor || '#ffffff',
                  fontFamily: fontFamily || 'inherit',
                }}
              >
                Secondary Button
              </div>
            </div>

            <div
              className="space-y-1"
              style={{ fontFamily: fontFamily || 'inherit' }}
            >
              <h3 className="text-lg font-semibold">Sample Heading</h3>
              <p className="text-sm text-muted-foreground">
                This is how your custom font will look in paragraph text.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium">Brand Guidelines</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• Logo should be clear and recognizable</li>
              <li>• Use colors that provide good contrast</li>
              <li>• Choose readable fonts for body text</li>
              <li>• Test on both light and dark backgrounds</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
