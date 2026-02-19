'use client'

import { useQuery } from '@tanstack/react-query'

export interface SlaTicket {
  id: string
  ticket_number: string
  client_name: string | null
  sla_due_at: string
  created_at: string
  provider_name: string | null
  hours_remaining: number
}

export interface SlaSummary {
  totalPending: number
  overdueCount: number
  approachingCount: number
  onTrackCount: number
  complianceRate: number
  metSla: number
  totalResolved: number
}

export interface SlaData {
  overdue: SlaTicket[]
  approaching: SlaTicket[]
  onTrack: SlaTicket[]
  summary: SlaSummary
}

export function useSlaStats() {
  return useQuery({
    queryKey: ['sla-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats/sla')
      if (!res.ok) throw new Error('Failed to fetch SLA stats')
      return res.json() as Promise<SlaData>
    },
    staleTime: 2 * 60 * 1000,
  })
}
