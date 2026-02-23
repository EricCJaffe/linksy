'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Provider, ProviderDetail, ProviderFilters, NeedCategory, ProviderNote, NoteType, NoteAttachment } from '@/lib/types/linksy'

function buildProviderParams(filters: ProviderFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.sector && filters.sector !== 'all') params.set('sector', filters.sector)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.referral_type && filters.referral_type !== 'all') params.set('referral_type', filters.referral_type)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  return params.toString()
}

export function useProviders(filters: ProviderFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['providers', filters],
    queryFn: async () => {
      const qs = buildProviderParams(filters)
      const res = await fetch(`/api/providers?${qs}`)
      if (!res.ok) throw new Error('Failed to fetch providers')
      return res.json() as Promise<{
        providers: Provider[]
        pagination: { total: number; hasMore: boolean; nextOffset: number | null }
      }>
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  })
}

export function useProvider(id: string | undefined, statusFilter?: 'all' | 'open' | 'closed', options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['provider', id, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      const qs = params.toString()
      const res = await fetch(`/api/providers/${id}${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch provider')
      return res.json() as Promise<ProviderDetail>
    },
    enabled: options?.enabled ?? !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpdateProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Provider>) => {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update provider')
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['providers'] })
    },
  })
}

export function useNeedCategories() {
  return useQuery({
    queryKey: ['needCategories'],
    queryFn: async () => {
      const res = await fetch('/api/need-categories')
      if (!res.ok) throw new Error('Failed to fetch need categories')
      return res.json() as Promise<NeedCategory[]>
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateNote(providerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ note_type, content, is_private, attachments }: { note_type: NoteType; content: string; is_private?: boolean; attachments?: NoteAttachment[] }) => {
      const res = await fetch(`/api/providers/${providerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_type, content, is_private, attachments }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.details || data?.error || 'Failed to create note')
      }
      return res.json() as Promise<ProviderNote>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] })
    },
  })
}

export interface ProviderAnalytics {
  allTime: { total: number; profile_view: number; phone_click: number; website_click: number; directions_click: number }
  last30Days: { total: number; profile_view: number; phone_click: number; website_click: number; directions_click: number }
}

export function useProviderAnalytics(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-analytics', providerId],
    queryFn: async () => {
      const res = await fetch(`/api/providers/${providerId}/analytics`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json() as Promise<ProviderAnalytics>
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateNote(providerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      noteId,
      note_type,
      content,
      is_private,
      attachments,
      is_pinned,
    }: {
      noteId: string
      note_type?: NoteType
      content?: string
      is_private?: boolean
      attachments?: NoteAttachment[]
      is_pinned?: boolean
    }) => {
      const res = await fetch(`/api/providers/${providerId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_type, content, is_private, attachments, is_pinned }),
      })
      if (!res.ok) throw new Error('Failed to update note')
      return res.json() as Promise<ProviderNote>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] })
    },
  })
}
