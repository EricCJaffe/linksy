export interface AuditLog {
  id: string
  user_id: string
  tenant_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    email: string
    profile?: {
      full_name: string | null
    }
  }
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  action_type?: string
  user_id?: string
  from_date?: string
  to_date?: string
}

export interface AuditLogsResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function fetchAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams()

  if (filters.page) params.set('page', filters.page.toString())
  if (filters.limit) params.set('limit', filters.limit.toString())
  if (filters.action_type) params.set('action_type', filters.action_type)
  if (filters.user_id) params.set('user_id', filters.user_id)
  if (filters.from_date) params.set('from_date', filters.from_date)
  if (filters.to_date) params.set('to_date', filters.to_date)

  const response = await fetch(`/api/audit-logs?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch audit logs')
  }

  return response.json()
}

export async function exportAuditLogsToCSV(
  filters: AuditLogFilters = {}
): Promise<void> {
  // Fetch all logs (without pagination for export)
  const { logs } = await fetchAuditLogs({ ...filters, limit: 10000 })

  // Convert to CSV
  const headers = [
    'Timestamp',
    'User',
    'Action',
    'Resource Type',
    'Resource ID',
    'IP Address',
    'Details',
  ]

  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.user?.profile?.full_name || log.user?.email || 'Unknown',
    log.action,
    log.resource_type,
    log.resource_id || '',
    log.ip_address || '',
    JSON.stringify(log.details || {}),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(cell).replace(/"/g, '""')
          return escaped.includes(',') || escaped.includes('\n')
            ? `"${escaped}"`
            : escaped
        })
        .join(',')
    ),
  ].join('\n')

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
  )
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
