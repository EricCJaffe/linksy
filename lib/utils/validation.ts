import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  password: passwordSchema,
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  avatar_url: z.string().url().optional().nullable(),
  timezone: z.string().optional().nullable(),
  theme: z.enum(['light', 'dark', 'system']).optional().nullable(),
  language: z.string().optional().nullable(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
})

// Base tenant schema for updates
export const tenantSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: slugSchema,
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  track_location: z.boolean().optional(),
})

// Extended schema for creating tenants (includes admin user fields)
export const createTenantSchema = tenantSchema.extend({
  admin_email: emailSchema,
  admin_name: z.string().min(2, 'Admin name must be at least 2 characters'),
})

export const invitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'member']),
})

export const acceptInviteSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  password: passwordSchema,
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const brandingSchema = z.object({
  logo_url: z.string().url().optional(),
  favicon_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  font_family: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type TenantInput = z.infer<typeof tenantSchema>
export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type InvitationInput = z.infer<typeof invitationSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
export type BrandingInput = z.infer<typeof brandingSchema>

// Validation utility functions

const MAX_PAGE_LIMIT = 100
const DEFAULT_PAGE_LIMIT = 50

/**
 * Validate and sanitize pagination parameters
 * @param limitParam - Raw limit parameter from query string
 * @param offsetParam - Raw offset parameter from query string
 * @returns Validated { limit, offset } with safe values
 */
export function validatePagination(
  limitParam: string | null,
  offsetParam: string | null
): { limit: number; offset: number } {
  // Parse and validate limit
  const parsedLimit = limitParam ? parseInt(limitParam, 10) : DEFAULT_PAGE_LIMIT
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1
    ? DEFAULT_PAGE_LIMIT
    : Math.min(parsedLimit, MAX_PAGE_LIMIT)

  // Parse and validate offset
  const parsedOffset = offsetParam ? parseInt(offsetParam, 10) : 0
  const offset = Number.isNaN(parsedOffset) || parsedOffset < 0
    ? 0
    : parsedOffset

  return { limit, offset }
}

/**
 * Sanitize error message for production
 * Hides detailed error messages in production, shows full details in development
 */
export function sanitizeError(error: unknown, fallbackMessage: string = 'An error occurred'): string {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // In production, return generic message
  return fallbackMessage
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .slice(0, 255) // Limit length
}

/**
 * Sanitize folder path to prevent path traversal
 */
export function sanitizeFolderPath(path: string): string {
  return path
    .split('/')
    .filter(segment => segment && segment !== '.' && segment !== '..')
    .map(segment => segment.replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join('/')
}
