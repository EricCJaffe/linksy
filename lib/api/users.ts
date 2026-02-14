import type { TenantUser } from '@/lib/types/tenant'

/**
 * Fetch all users in a tenant (admin only)
 */
export async function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const response = await fetch(`/api/users?tenant_id=${tenantId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch users')
  }

  return response.json()
}

/**
 * Invite a user to a tenant (admin only)
 * This sends an invitation email
 */
export async function inviteUser(
  tenantId: string,
  email: string,
  role: 'admin' | 'member'
): Promise<void> {
  const response = await fetch('/api/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenantId,
      email,
      role,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to invite user')
  }
}

/**
 * Update a user's role in a tenant (admin only)
 */
export async function updateUserRole(
  userId: string,
  tenantId: string,
  role: 'admin' | 'member'
): Promise<TenantUser> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenantId,
      role,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user role')
  }

  return response.json()
}

/**
 * Remove a user from a tenant (admin only)
 * The user account remains but loses access to this tenant
 */
export async function removeUser(userId: string, tenantId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenantId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove user')
  }
}
