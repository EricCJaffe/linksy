'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditLogTable } from '@/components/admin/audit-log-table'
import { AuditLogFilters } from '@/components/admin/audit-log-filters'
import {
  fetchAuditLogs,
  exportAuditLogsToCSV,
  type AuditLogFilters as Filters,
} from '@/lib/api/audit-logs'
import { logger } from '@/lib/utils/logger'

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 50,
  })
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters),
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportAuditLogsToCSV(filters)
    } catch (error) {
      logger.error('Export failed', error instanceof Error ? error : new Error('Unknown error'), {
        filters
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            View all system activity and changes
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <AuditLogFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                {data?.pagination.total || 0} total entries
                {filters.action_type && ` • Filtered by action: ${filters.action_type}`}
                {filters.from_date &&
                  ` • From ${new Date(filters.from_date).toLocaleDateString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogTable logs={data?.logs || []} isLoading={isLoading} />

              {data && data.pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.pagination.page === 1}
                      onClick={() => handlePageChange(data.pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.pagination.page === data.pagination.pages}
                      onClick={() => handlePageChange(data.pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
