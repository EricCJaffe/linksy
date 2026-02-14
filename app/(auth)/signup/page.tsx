'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { signupSchema, type SignupInput } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<{
    tenant_name: string
    email: string
  } | null>(null)

  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  useEffect(() => {
    if (token) {
      // Fetch invitation details
      const fetchInvitation = async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('invitations')
          .select(`
            email,
            tenant:tenants(name)
          `)
          .eq('token', token)
          .is('accepted_at', null)
          .single<{ email: string; tenant: { name: string } }>()

        if (error || !data) {
          setError('Invalid or expired invitation')
          return
        }

        // Type assertion for the nested tenant data
        const invitationData = data as any
        setInvitation({
          tenant_name: invitationData.tenant?.name || '',
          email: invitationData.email,
        })
        setValue('email', invitationData.email)
      }

      fetchInvitation()
    }
  }, [token, setValue])

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // If there's a token, accept the invitation
      if (token && authData.user) {
        const response = await fetch(`/api/invitations/accept?token=${token}`, {
          method: 'POST',
        })

        if (!response.ok) {
          const error = await response.json()
          setError(error.message || 'Failed to accept invitation')
          return
        }
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {invitation ? `Join ${invitation.tenant_name}` : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {invitation
              ? 'Complete your registration to join the organization'
              : 'Enter your details to create an account'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled={!!invitation}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
