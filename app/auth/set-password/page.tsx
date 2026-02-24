'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(true)

  const from = searchParams.get('from')
  const supabase = createClient()

  useEffect(() => {
    console.log('[SET-PASSWORD] Page loaded')
    console.log('[SET-PASSWORD] Current URL:', window.location.href)
    console.log('[SET-PASSWORD] Hash:', window.location.hash)

    // Manually extract tokens from hash and set session
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1)) // Remove # and parse

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    console.log('[SET-PASSWORD] Access token found:', !!accessToken)
    console.log('[SET-PASSWORD] Refresh token found:', !!refreshToken)

    if (accessToken && refreshToken) {
      console.log('[SET-PASSWORD] Setting session manually...')

      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        console.log('[SET-PASSWORD] setSession result:', { data, error })

        if (error) {
          console.error('[SET-PASSWORD] Failed to set session:', error)
          setError('Session expired. Please request a new invitation.')
          setVerifying(false)
          return
        }

        if (data.user) {
          console.log('[SET-PASSWORD] Session established! User:', data.user.email)
          console.log('[SET-PASSWORD] User metadata:', data.user.user_metadata)
          setVerifying(false)
        } else {
          console.error('[SET-PASSWORD] No user in session')
          setError('Session expired. Please request a new invitation.')
          setVerifying(false)
        }
      })
    } else {
      console.error('[SET-PASSWORD] No tokens in hash!')
      setError('Session expired. Please request a new invitation.')
      setVerifying(false)
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        throw error
      }

      // Password set successfully - redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error setting password:', err)
      setError(err.message || 'Failed to set password. Please try again.')
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying...</CardTitle>
            <CardDescription>Please wait while we verify your invitation.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error && !password) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            {from === 'recovery'
              ? 'Enter a new password for your account.'
              : 'Welcome! Please set a password to complete your account setup.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 8 characters)"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Setting Password...' : 'Set Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  )
}
