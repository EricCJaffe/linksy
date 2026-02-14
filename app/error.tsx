'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { logError } from '@/lib/utils/error-handler'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console and error tracking service
    logError(error, {
      component: 'GlobalErrorPage',
      metadata: {
        digest: error.digest,
      },
    })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We encountered an unexpected error. Our team has been notified and is
            working to fix the issue.
          </p>

          {error.digest && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                Error ID: <span className="font-mono">{error.digest}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Please include this ID when contacting support.
              </p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Error Details (Development Only):
              </p>
              <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">What you can do:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Try refreshing the page</li>
              <li>Go back to the home page</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={reset} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button onClick={() => (window.location.href = '/')} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Go home
          </Button>
          <Button
            onClick={() => (window.location.href = 'mailto:support@example.com')}
            variant="outline"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact support
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
