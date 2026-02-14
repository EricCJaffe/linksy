'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCurrentUser, useUpdateProfile } from '@/lib/hooks/useCurrentUser'
import { profileSchema, changePasswordSchema, type ProfileInput, type ChangePasswordInput } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageUpload } from '@/components/ui/image-upload'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { uploadAvatar } from '@/lib/storage/upload'
import { TIMEZONES, LANGUAGES, THEMES } from '@/lib/constants/timezones'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function ProfileForm() {
  const { data: user, isLoading } = useCurrentUser()
  const { mutate: updateProfile, isPending, error } = useUpdateProfile()
  const { toast } = useToast()
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: user?.profile?.full_name || '',
      avatar_url: user?.profile?.avatar_url || null,
      timezone: user?.profile?.timezone || null,
      theme: (user?.profile?.theme as 'light' | 'dark' | 'system') || null,
      language: user?.profile?.language || null,
      email_notifications: user?.profile?.email_notifications ?? true,
      push_notifications: user?.profile?.push_notifications ?? false,
    },
  })

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const avatarUrl = watch('avatar_url')

  const onSubmit = (data: ProfileInput) => {
    updateProfile(data)
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) throw new Error('User not found')
    const url = await uploadAvatar(file, user.id)
    setValue('avatar_url', url, { shouldDirty: true })
    return url
  }

  const handlePasswordChange = async (data: ChangePasswordInput) => {
    setPasswordError(null)
    setIsChangingPassword(true)

    try {
      const supabase = createClient()

      // First verify the current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.current_password,
      })

      if (signInError) {
        setPasswordError('Current password is incorrect')
        setIsChangingPassword(false)
        return
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.new_password,
      })

      if (updateError) {
        setPasswordError(updateError.message)
      } else {
        toast({
          title: 'Password updated',
          description: 'Your password has been changed successfully.',
        })
        passwordForm.reset()
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const initials = user?.profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?'

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal information
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
              <Label>Profile Photo</Label>
              <ImageUpload
                value={avatarUrl}
                onChange={(url) => setValue('avatar_url', url, { shouldDirty: true })}
                onRemove={() => setValue('avatar_url', null, { shouldDirty: true })}
                disabled={isPending}
                uploadFn={handleAvatarUpload}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                {...register('full_name')}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={watch('timezone') || undefined}
                  onValueChange={(value) => setValue('timezone', value, { shouldDirty: true })}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={watch('language') || undefined}
                  onValueChange={(value) => setValue('language', value, { shouldDirty: true })}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={watch('theme') || undefined}
                onValueChange={(value) => setValue('theme', value as 'light' | 'dark' | 'system', { shouldDirty: true })}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email_notifications"
                checked={watch('email_notifications') ?? true}
                onCheckedChange={(checked) =>
                  setValue('email_notifications', checked, { shouldDirty: true })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push_notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in your browser
                </p>
              </div>
              <Switch
                id="push_notifications"
                checked={watch('push_notifications') ?? false}
                onCheckedChange={(checked) =>
                  setValue('push_notifications', checked, { shouldDirty: true })
                }
              />
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
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
          <CardContent className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {passwordError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                {...passwordForm.register('current_password')}
              />
              {passwordForm.formState.errors.current_password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                {...passwordForm.register('new_password')}
              />
              {passwordForm.formState.errors.new_password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.new_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                {...passwordForm.register('confirm_password')}
              />
              {passwordForm.formState.errors.confirm_password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirm_password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isChangingPassword || !passwordForm.formState.isDirty}
            >
              {isChangingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
