'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; sort_order?: number }) => {
      const res = await fetch('/api/need-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create category')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needCategories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; sort_order?: number; is_active?: boolean }) => {
      const res = await fetch(`/api/need-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update category')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needCategories'] })
    },
  })
}

export function useCreateNeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { category_id: string; name: string; synonyms?: string[] }) => {
      const res = await fetch('/api/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create need')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needCategories'] })
    },
  })
}

export function useUpdateNeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; category_id?: string; synonyms?: string[]; is_active?: boolean }) => {
      const res = await fetch(`/api/needs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update need')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needCategories'] })
    },
  })
}
