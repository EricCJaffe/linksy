'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Doc } from '@/lib/types/linksy'

interface DocFilters {
  q?: string
  category?: string
}

export function useDocs(filters: DocFilters = {}) {
  return useQuery({
    queryKey: ['docs', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.category) params.set('category', filters.category)
      const res = await fetch(`/api/docs${params.size ? `?${params}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch docs')
      return res.json() as Promise<{ docs: Doc[] }>
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useDoc(slug: string | undefined) {
  return useQuery({
    queryKey: ['docs', slug],
    queryFn: async () => {
      const res = await fetch(`/api/docs/${slug}`)
      if (res.status === 403) throw new Error('Access denied')
      if (!res.ok) throw new Error('Failed to fetch doc')
      return res.json() as Promise<Doc>
    },
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateDoc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Doc>) => {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create doc')
      }
      return res.json() as Promise<Doc>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}

export function useUpdateDoc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ slug, ...data }: { slug: string } & Partial<Doc>) => {
      const res = await fetch(`/api/docs/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update doc')
      }
      return res.json() as Promise<Doc>
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      queryClient.invalidateQueries({ queryKey: ['docs', variables.slug] })
    },
  })
}

export function useDeleteDoc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/docs/${slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete doc')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}
