import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { validateCSRF } from '@/lib/middleware/csrf'
import { globalRateLimit } from '@/lib/utils/rate-limit'

const publicRoutes = ['/', '/login', '/signup', '/reset-password']
const authRoutes = ['/login', '/signup', '/reset-password']

/**
 * Next.js middleware for authentication, route protection, rate limiting, and CSRF protection.
 * - Rate limits all API routes (100 requests per minute per IP)
 * - Protects /dashboard/* routes (requires authentication)
 * - Allows public routes: /, /login, /api/public/*
 * - Refreshes session on each request
 * - Validates CSRF tokens for API routes
 * - Redirects to login if not authenticated
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthRoute = authRoutes.includes(pathname)
  const isPublicApiRoute = pathname.startsWith('/api/public/')
  const isApiRoute = pathname.startsWith('/api/')
  const isDashboardRoute = pathname.startsWith('/dashboard')

  // Rate limiting for API routes
  if (isApiRoute) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const rateLimitResult = globalRateLimit(ip)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.reset.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      )
    }

    // Add rate limit headers to successful requests
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toISOString())
  }

  // CSRF Protection for API routes (except public API routes)
  if (isApiRoute && !isPublicApiRoute) {
    const csrfError = validateCSRF(request)
    if (csrfError) {
      return csrfError
    }
  }

  // Allow public API routes without authentication
  if (isPublicApiRoute) {
    return response
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect dashboard routes - redirect to login if not authenticated
  if (isDashboardRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect unauthenticated users to login for other protected routes
  if (!user && !isPublicRoute && !isPublicApiRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
