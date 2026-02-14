/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks by validating request origins
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

/**
 * Validate that the request origin matches allowed origins
 * This prevents CSRF attacks by ensuring requests come from trusted sources
 */
export function validateCSRF(request: NextRequest): NextResponse | null {
  const method = request.method

  // Only check CSRF for state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null // Allow GET, HEAD, OPTIONS
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  // Get allowed origins from environment
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null

  const allowedOrigins = [
    siteUrl,
    vercelUrl,
    host ? `https://${host}` : null,
    host ? `http://${host}` : null, // Allow http for local development
  ].filter(Boolean) as string[]

  // Check Origin header (most reliable)
  if (origin) {
    const isAllowed = allowedOrigins.some((allowed) => origin === allowed)
    if (!isAllowed) {
      logger.securityEvent('CSRF attack blocked - invalid origin', {
        origin,
        allowedOrigins,
        method,
      })
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      )
    }
    return null // Valid
  }

  // Fallback to Referer header if Origin not present
  if (referer) {
    const refererUrl = new URL(referer)
    const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`

    const isAllowed = allowedOrigins.some((allowed) => refererOrigin === allowed)
    if (!isAllowed) {
      logger.securityEvent('CSRF attack blocked - invalid referer', {
        referer: refererOrigin,
        allowedOrigins,
        method,
      })
      return NextResponse.json(
        { error: 'Invalid request referer' },
        { status: 403 }
      )
    }
    return null // Valid
  }

  // No Origin or Referer header - block for security
  // Modern browsers always send these for cross-origin requests
  logger.securityEvent('CSRF attack blocked - missing headers', { method })
  return NextResponse.json(
    { error: 'Missing origin or referer header' },
    { status: 403 }
  )
}

/**
 * Helper to use CSRF validation in API routes
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfError = validateCSRF(request)
 *   if (csrfError) return csrfError
 *
 *   // Continue with request handling...
 * }
 * ```
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const csrfError = validateCSRF(request)
    if (csrfError) return csrfError

    return handler(request)
  }
}
