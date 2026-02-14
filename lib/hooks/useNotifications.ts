'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  tenant_id: string | null
  type: string
  title: string
  message: string
  action_url: string | null
  read_at: string | null
  created_at: string
  metadata: Record<string, any> | null
}

export function useNotifications(tenantId?: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return []

      let queryBuilder = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (tenantId) {
        queryBuilder = queryBuilder.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      }

      const { data, error } = await queryBuilder

      if (error) {
        throw error
      }

      return data as Notification[]
    },
    enabled: true,
  })

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  return query
}

export function useUnreadCount(tenantId?: string) {
  const { data: notifications } = useNotifications(tenantId)

  if (!notifications) return 0

  return notifications.filter(n => !n.read_at).length
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useToggleRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      })

      if (!response.ok) {
        throw new Error('Failed to update notification')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
