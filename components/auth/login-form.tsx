'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/utils/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#F25022" />
      <path d="M24 11.4H12.6V0H24v11.4z" fill="#7FBA00" />
      <path d="M11.4 24H0V12.6h11.4V24z" fill="#00A4EF" />
      <path d="M24 24H12.6V12.6H24V24z" fill="#FFB900" />
    </svg>
  )
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const oauthError = searchParams.get('error')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  // IMMEDIATELY check hash for invite/recovery links and redirect
  useEffect(() => {
    const hash = window.location.hash
    console.log('[LOGIN] Current hash:', hash)
    console.log('[LOGIN] Full URL:', window.location.href)

    // If hash contains type=invite or type=recovery, redirect to set-password immediately
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      const targetUrl = '/auth/set-password' + hash
      console.log('[LOGIN] Detected invite/recovery, redirecting to:', targetUrl)
      // Preserve the entire hash for Supabase to process
      window.location.href = targetUrl
      return
    }

    console.log('[LOGIN] No invite/recovery in hash, normal login flow')

    // Otherwise, check for authenticated session
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && session.user.user_metadata?.contact_id) {
        router.push('/auth/set-password?from=invite')
      } else if (session?.user) {
        router.push(redirectTo)
      }
    })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.user_metadata?.contact_id) {
        router.push('/auth/set-password?from=invite')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, redirectTo])

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'azure') => {
    setOauthLoading(provider)
    setError(null)

    try {
      const supabase = createClient()
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      console.log('OAuth redirectTo:', callbackUrl)

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
          scopes: provider === 'azure' ? 'email profile openid' : undefined,
        },
      })

      if (authError) {
        setError(authError.message)
        setOauthLoading(null)
      }
      // On success the browser navigates away — no need to clear loading state
    } catch (err) {
      setError('An unexpected error occurred')
      setOauthLoading(null)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {(error || oauthError) && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error || (oauthError === 'oauth_error' ? 'OAuth sign-in failed. Please try again.' : oauthError)}
            </div>
          )}

          {/* Social login buttons */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!!oauthLoading || isLoading}
              onClick={() => handleOAuth('google')}
            >
              <GoogleIcon />
              <span className="ml-2">
                {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!!oauthLoading || isLoading}
              onClick={() => handleOAuth('azure')}
            >
              <MicrosoftIcon />
              <span className="ml-2">
                {oauthLoading === 'azure' ? 'Redirecting…' : 'Continue with Microsoft'}
              </span>
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
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
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading || !!oauthLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div className="text-sm text-muted-foreground">
            <Link
              href="/reset-password"
              className="text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
