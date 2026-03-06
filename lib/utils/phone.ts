/**
 * Phone number formatting utilities
 * Standard display format: 1-(XXX)-XXX-XXXX
 */

/**
 * Format a phone number for display.
 * Strips all non-digits, then formats as 1-(XXX)-XXX-XXXX.
 * Returns the original string if it can't be parsed to 10 or 11 digits.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')

  // 10-digit US number
  if (digits.length === 10) {
    return `1-(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // 11-digit with leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `1-(${digits.slice(1, 4)})-${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  // Can't parse — return original
  return phone
}

/**
 * Strip a phone number to digits-only for tel: links.
 */
export function phoneToTel(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  // Ensure US numbers have leading 1
  if (digits.length === 10) return `1${digits}`
  return digits
}
