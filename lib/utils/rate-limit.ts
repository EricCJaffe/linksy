/**
 * In-memory rate limiting utility
 *
 * Tracks request counts per identifier (typically IP address) within time windows.
 * Automatically cleans up old entries to prevent memory leaks.
 *
 * WARNING: This implementation:
 * - Does NOT persist across server restarts
 * - Does NOT work across multiple server instances
 * - Is suitable for development and single-instance deployments only
 *
 * For production with multiple instances, use Upstash Redis (see SECURITY.md)
 */

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
}

interface RequestWindow {
  requests: number[]
  windowStart: number
}

const requestStore = new Map<string, RequestWindow>()

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (typically IP address)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult indicating if request is allowed
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  // Get or create request window
  let window = requestStore.get(identifier)

  if (!window) {
    window = { requests: [], windowStart: now }
    requestStore.set(identifier, window)
  }

  // Filter out requests outside the current window
  window.requests = window.requests.filter(timestamp => timestamp > windowStart)

  // Check if limit exceeded
  const currentCount = window.requests.length
  const remaining = Math.max(0, maxRequests - currentCount)
  const success = currentCount < maxRequests

  if (success) {
    // Add current request timestamp
    window.requests.push(now)
    window.windowStart = now
  }

  // Calculate reset time (end of current window)
  const oldestRequest = window.requests[0] || now
  const reset = new Date(oldestRequest + windowMs)

  return {
    success,
    limit: maxRequests,
    remaining: success ? remaining - 1 : 0,
    reset,
  }
}

/**
 * Predefined rate limiters for common use cases
 */

// Global rate limit: 100 requests per minute
export function globalRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, 100, 60 * 1000)
}

// Auth rate limit: 5 attempts per 15 minutes
export function authRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, 5, 15 * 60 * 1000)
}

// Upload rate limit: 10 uploads per minute
export function uploadRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(identifier, 10, 60 * 1000)
}

/**
 * Cleanup function to prevent memory leaks
 * Removes entries that haven't been accessed in the last hour
 */
function cleanup() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000

  requestStore.forEach((window, key) => {
    if (window.windowStart < oneHourAgo) {
      requestStore.delete(key)
    }
  })
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 5 * 60 * 1000)
}

/**
 * Get current store size (for monitoring/debugging)
 */
export function getRateLimitStats() {
  return {
    totalIdentifiers: requestStore.size,
    identifiers: Array.from(requestStore.keys()),
  }
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearRateLimits() {
  requestStore.clear()
}
