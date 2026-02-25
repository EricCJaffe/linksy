'use client'

import { useCurrentUser } from './useCurrentUser'
import type { ProviderDetail, ProviderContact } from '@/lib/types/linksy'

export interface ProviderPermissions {
  // Role checks
  isSiteAdmin: boolean
  isProviderAdmin: boolean
  isProviderContact: boolean

  // User's contact record
  userContact: ProviderContact | undefined

  // Granular permissions
  canEditProvider: boolean
  canManageAllContacts: boolean
  canEditOwnContact: boolean
  canArchiveContacts: boolean
  canAddContacts: boolean
  canManageHostSettings: boolean
  canEnableHostFlag: boolean

  // Tab visibility
  shouldShowHostSettingsTab: boolean
}

export function useProviderPermissions(
  provider: ProviderDetail
): ProviderPermissions {
  const { data: currentUser } = useCurrentUser()

  // Find the user's contact record in this provider
  const userContact = provider.contacts.find(
    (c) => c.user_id === currentUser?.profile?.id
  )

  // Role checks
  const isSiteAdmin = currentUser?.profile?.role === 'site_admin'
  const isProviderAdmin = userContact?.provider_role === 'admin'
  const isProviderContact = !!userContact

  // Granular permissions
  const canEditProvider = isSiteAdmin || isProviderAdmin
  const canManageAllContacts = isSiteAdmin || isProviderAdmin
  const canEditOwnContact = isProviderContact
  const canArchiveContacts = isSiteAdmin || isProviderAdmin
  const canAddContacts = isSiteAdmin || isProviderAdmin
  const canManageHostSettings = isSiteAdmin || isProviderAdmin
  const canEnableHostFlag = isSiteAdmin

  // Tab visibility
  const shouldShowHostSettingsTab =
    (provider.is_host ?? false) && (isSiteAdmin || isProviderAdmin)

  return {
    isSiteAdmin,
    isProviderAdmin,
    isProviderContact,
    userContact,
    canEditProvider,
    canManageAllContacts,
    canEditOwnContact,
    canArchiveContacts,
    canAddContacts,
    canManageHostSettings,
    canEnableHostFlag,
    shouldShowHostSettingsTab,
  }
}
