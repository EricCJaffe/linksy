import type { Tenant, CreateTenantInput, UpdateTenantInput } from '@/lib/types/tenant'

/**
 * Fetch all tenants (site admin only)
 */
export async function listTenants(type: 'region' | 'provider' | 'all' = 'all'): Promise<Tenant[]> {
  const query = type === 'all' ? '' : `?type=${encodeURIComponent(type)}`
  const response = await fetch(`/api/tenants${query}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch tenants')
  }

  return response.json()
}

/**
 * Get a single tenant by ID
 */
export async function getTenant(id: string): Promise<Tenant> {
  const response = await fetch(`/api/tenants/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch tenant')
  }

  return response.json()
}

/**
 * Create a new tenant (site admin only)
 */
export async function createTenant(data: CreateTenantInput): Promise<Tenant> {
  const response = await fetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create tenant')
  }

  return response.json()
}

/**
 * Update a tenant (site admin only)
 */
export async function updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
  const response = await fetch(`/api/tenants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update tenant')
  }

  return response.json()
}

/**
 * Delete a tenant (site admin only)
 * This is a hard delete that removes all associated data
 */
export async function deleteTenant(id: string): Promise<void> {
  const response = await fetch(`/api/tenants/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete tenant')
  }
}
