'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProviderContact } from '@/lib/types/linksy'

export function useCreateProviderContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ providerId, ...data }: { providerId: string } & Partial<ProviderContact>) => {
      const res = await fetch(`/api/providers/${providerId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create contact')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider', variables.providerId] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })
}

export function useUpdateProviderContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      providerId,
      contactId,
      ...data
    }: {
      providerId: string
      contactId: string
    } & Partial<ProviderContact>) => {
      const res = await fetch(`/api/providers/${providerId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update contact')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider', variables.providerId] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })
}

export function useDeleteProviderContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ providerId, contactId }: { providerId: string; contactId: string }) => {
      const res = await fetch(`/api/providers/${providerId}/contacts/${contactId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete contact')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider', variables.providerId] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })
}

export function useInviteProviderContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      providerId,
      contactId,
      email,
      full_name,
    }: {
      providerId: string
      contactId: string
      email: string
      full_name?: string
    }) => {
      const res = await fetch(`/api/providers/${providerId}/contacts/${contactId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send invitation')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider', variables.providerId] })
    },
  })
}
