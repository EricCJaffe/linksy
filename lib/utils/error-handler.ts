import { toast } from '@/hooks/use-toast'
import { PostgrestError } from '@supabase/supabase-js'

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export interface ErrorResponse {
  error: string | ApiError
  status?: number
}

/**
 * Handle API errors and return a user-friendly message
 */
export function handleApiError(error: any): string {
  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }

  // Handle Response errors
  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.'
      case 401:
        return 'You are not authorized. Please sign in.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'This action conflicts with existing data.'
      case 422:
        return 'Invalid data. Please check your input.'
      case 429:
        return 'Too many requests. Please try again later.'
      case 500:
        return 'Server error. Please try again later.'
      case 503:
        return 'Service temporarily unavailable. Please try again later.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  // Handle structured error responses
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
    if ('error' in error) {
      if (typeof error.error === 'string') {
        return error.error
      }
      if (typeof error.error === 'object' && 'message' in error.error) {
        return error.error.message
      }
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Handle Supabase/PostgreSQL errors and return user-friendly messages
 */
export function handleSupabaseError(error: PostgrestError | any): string {
  if (!error) return 'An unexpected error occurred.'

  // Check if it's a PostgrestError
  if ('code' in error && 'message' in error) {
    const postgrestError = error as PostgrestError

    // Common PostgreSQL error codes
    switch (postgrestError.code) {
      case '23505': // unique_violation
        return 'This record already exists. Please use a different value.'
      case '23503': // foreign_key_violation
        return 'Cannot delete this record because it is referenced by other data.'
      case '23502': // not_null_violation
        return 'Required field is missing. Please fill in all required fields.'
      case '42501': // insufficient_privilege
        return 'You do not have permission to perform this action.'
      case '42P01': // undefined_table
        return 'Database table not found. Please contact support.'
      case '42703': // undefined_column
        return 'Database column not found. Please contact support.'
      case '22P02': // invalid_text_representation
        return 'Invalid data format. Please check your input.'
      case '23514': // check_violation
        return 'Data validation failed. Please check your input.'
      case 'PGRST116': // no rows returned
        return 'No matching records found.'
      case 'PGRST301': // invalid JWT
        return 'Session expired. Please sign in again.'
      default:
        // Return the error message if it's user-friendly
        if (postgrestError.message && !postgrestError.message.includes('::')) {
          return postgrestError.message
        }
        return 'A database error occurred. Please try again.'
    }
  }

  // Handle auth errors
  if ('status' in error) {
    switch (error.status) {
      case 400:
        return error.message || 'Invalid request.'
      case 401:
        return 'Authentication failed. Please check your credentials.'
      case 422:
        return error.message || 'Invalid email or password.'
      default:
        return error.message || 'An authentication error occurred.'
    }
  }

  // Fallback
  return handleApiError(error)
}

/**
 * Show an error toast notification
 */
export function toastError(
  message: string,
  options?: {
    title?: string
    duration?: number
  }
): void {
  toast({
    title: options?.title || 'Error',
    description: message,
    variant: 'destructive',
    duration: options?.duration || 5000,
  })
}

/**
 * Show a success toast notification
 */
export function toastSuccess(
  message: string,
  options?: {
    title?: string
    duration?: number
  }
): void {
  toast({
    title: options?.title || 'Success',
    description: message,
    duration: options?.duration || 3000,
  })
}

/**
 * Log error to console with context (and could send to error tracking service)
 */
export function logError(
  error: any,
  context?: {
    component?: string
    action?: string
    metadata?: Record<string, any>
  }
): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo)
  }

  // TODO: Send to error tracking service (e.g., Sentry, LogRocket, etc.)
  // Example: Sentry.captureException(error, { contexts: { custom: context } })
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    component?: string
    showToast?: boolean
    onError?: (error: any) => void
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      const message = handleApiError(error)

      // Log the error
      logError(error, {
        component: options?.component,
        action: fn.name,
      })

      // Show toast if enabled
      if (options?.showToast !== false) {
        toastError(message)
      }

      // Call custom error handler
      options?.onError?.(error)

      throw error
    }
  }) as T
}

/**
 * Format validation errors from form libraries (e.g., Zod)
 */
export function formatValidationErrors(errors: any): string {
  if (Array.isArray(errors)) {
    return errors.map((e) => e.message).join(', ')
  }

  if (typeof errors === 'object' && errors !== null) {
    const messages: string[] = []
    for (const key in errors) {
      const error = errors[key]
      if (error && typeof error === 'object' && 'message' in error) {
        messages.push(error.message)
      } else if (Array.isArray(error)) {
        messages.push(...error.map((e) => e.message))
      }
    }
    return messages.join(', ')
  }

  return 'Validation failed'
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): ErrorResponse {
  return {
    error: {
      message,
      details,
    },
    status,
  }
}

/**
 * Check if a value is an error response
 */
export function isErrorResponse(value: any): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value
  )
}
