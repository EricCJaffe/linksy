/**
 * Default terminology used throughout the application
 * These terms can be customized per tenant
 */

export interface TerminologyDefinition {
  key: string
  defaultSingular: string
  defaultPlural: string
  description: string
  usedIn: string[]
}

export const DEFAULT_TERMINOLOGY: TerminologyDefinition[] = [
  {
    key: 'user',
    defaultSingular: 'User',
    defaultPlural: 'Users',
    description: 'Individual accounts that can log in and access the system',
    usedIn: ['User Management', 'Invitations', 'Profile Pages', 'Navigation'],
  },
  {
    key: 'tenant',
    defaultSingular: 'Organization',
    defaultPlural: 'Organizations',
    description: 'The company or group account that contains users',
    usedIn: ['Company Settings', 'Admin Dashboard', 'Navigation'],
  },
  {
    key: 'client',
    defaultSingular: 'Client',
    defaultPlural: 'Clients',
    description: 'External customers or companies you work with',
    usedIn: ['CRM Features', 'Project Management', 'Reporting'],
  },
]

/**
 * Get the custom term for a given key, or fall back to default
 */
export function getTerm(
  terminology: Record<string, string> | undefined,
  key: string,
  plural = false
): string {
  const customValue = terminology?.[plural ? `${key}_plural` : key]
  if (customValue) return customValue

  const definition = DEFAULT_TERMINOLOGY.find((t) => t.key === key)
  return plural ? definition?.defaultPlural || key : definition?.defaultSingular || key
}
