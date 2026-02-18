import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Sentry before importing the module under test
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

import { handleApiError, handleSupabaseError, logError } from '@/lib/utils/error-handler'
import * as Sentry from '@sentry/nextjs'

describe('handleApiError', () => {
  it('handles network fetch errors', () => {
    const err = new TypeError('Failed to fetch')
    expect(handleApiError(err)).toMatch(/network error/i)
  })

  it('handles 401 Response', () => {
    const res = new Response(null, { status: 401 })
    expect(handleApiError(res)).toMatch(/authorized/i)
  })

  it('handles 403 Response', () => {
    const res = new Response(null, { status: 403 })
    expect(handleApiError(res)).toMatch(/permission/i)
  })

  it('handles 404 Response', () => {
    const res = new Response(null, { status: 404 })
    expect(handleApiError(res)).toMatch(/not found/i)
  })

  it('handles 500 Response', () => {
    const res = new Response(null, { status: 500 })
    expect(handleApiError(res)).toMatch(/server error/i)
  })

  it('handles 429 Response', () => {
    const res = new Response(null, { status: 429 })
    expect(handleApiError(res)).toMatch(/too many requests/i)
  })

  it('extracts message from a plain Error instance', () => {
    const err = new Error('Something went wrong')
    expect(handleApiError(err)).toBe('Something went wrong')
  })

  it('extracts message from an object with a message field', () => {
    expect(handleApiError({ message: 'Custom message' })).toBe('Custom message')
  })

  it('extracts message from a nested error.message field', () => {
    expect(handleApiError({ error: { message: 'Nested message' } })).toBe('Nested message')
  })

  it('extracts string from a top-level error field', () => {
    expect(handleApiError({ error: 'String error' })).toBe('String error')
  })

  it('returns a fallback for completely unknown error shapes', () => {
    expect(handleApiError(42)).toMatch(/unexpected error/i)
    expect(handleApiError(null)).toMatch(/unexpected error/i)
  })
})

describe('handleSupabaseError', () => {
  it('returns a fallback for null/undefined', () => {
    expect(handleSupabaseError(null)).toMatch(/unexpected/i)
  })

  it('handles unique_violation (23505)', () => {
    expect(handleSupabaseError({ code: '23505', message: 'dup' })).toMatch(/already exists/i)
  })

  it('handles foreign_key_violation (23503)', () => {
    expect(handleSupabaseError({ code: '23503', message: 'fk' })).toMatch(/referenced/i)
  })

  it('handles not_null_violation (23502)', () => {
    expect(handleSupabaseError({ code: '23502', message: 'nn' })).toMatch(/required field/i)
  })

  it('handles insufficient_privilege (42501)', () => {
    expect(handleSupabaseError({ code: '42501', message: 'priv' })).toMatch(/permission/i)
  })

  it('handles expired JWT (PGRST301)', () => {
    expect(handleSupabaseError({ code: 'PGRST301', message: 'jwt' })).toMatch(/session expired/i)
  })

  it('handles auth 401 errors', () => {
    expect(handleSupabaseError({ status: 401, message: 'Auth failed' })).toMatch(/authentication failed/i)
  })

  it('surfaces user-friendly DB messages that do not contain "::"', () => {
    const result = handleSupabaseError({ code: '99999', message: 'Custom constraint violated' })
    expect(result).toBe('Custom constraint violated')
  })
})

describe('logError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls Sentry.captureException when given an Error instance', () => {
    const err = new Error('boom')
    logError(err, { component: 'TestComponent' })
    expect(Sentry.captureException).toHaveBeenCalledWith(err, expect.objectContaining({
      contexts: expect.objectContaining({ custom: expect.any(Object) }),
    }))
  })

  it('does not call Sentry.captureException for non-Error values', () => {
    logError('a string error')
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })
})
