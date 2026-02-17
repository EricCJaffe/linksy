'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProviderEvent } from '@/lib/types/linksy'

export function useCreateProviderEvent(providerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description?: string
      event_date: string
      location?: string
      is_public?: boolean
    }) => {
      const res = await fetch(`/api/providers/${providerId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create event')
      return res.json() as Promise<ProviderEvent>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] })
    },
  })
}

export function useUpdateProviderEvent(providerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      ...data
    }: {
      eventId: string
      title?: string
      description?: string
      event_date?: string
      location?: string
      is_public?: boolean
      status?: string
    }) => {
      const res = await fetch(`/api/providers/${providerId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update event')
      return res.json() as Promise<ProviderEvent>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] })
    },
  })
}

export function useDeleteProviderEvent(providerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/providers/${providerId}/events/${eventId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] })
    },
  })
}
