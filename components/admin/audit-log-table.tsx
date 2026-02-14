'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { AuditLog } from '@/lib/api/audit-logs'

interface AuditLogTableProps {
  logs: AuditLog[]
  isLoading?: boolean
}

const ACTION_COLORS: Record<string, string> = {
  'user.created': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'user.updated': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'user.deleted': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'user.invited': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'tenant.created': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'tenant.updated': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'tenant.deleted': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'module.enabled': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'module.disabled': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  'role.changed': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading audit logs...</div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">No audit logs found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>IP Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isExpanded = expandedRows.has(log.id)
            const userName =
              log.user?.profile?.full_name || log.user?.email || 'Unknown'

            return (
              <>
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleRow(log.id)}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRow(log.id)
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{userName}</p>
                      {log.user?.email && log.user.profile?.full_name && (
                        <p className="text-xs text-muted-foreground">
                          {log.user.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-mono text-xs',
                        ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{log.resource_type}</span>
                      {log.resource_id && (
                        <span className="ml-1 text-muted-foreground">
                          ({log.resource_id.substring(0, 8)}...)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.ip_address || '-'}
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow key={`${log.id}-details`}>
                    <TableCell colSpan={6} className="bg-muted/30 p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="mb-2 font-medium">Details</h4>
                          {log.details ? (
                            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No additional details
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          <div>
                            <span className="font-medium">Resource ID:</span>{' '}
                            <span className="font-mono text-muted-foreground">
                              {log.resource_id || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">User Agent:</span>{' '}
                            <span className="text-muted-foreground">
                              {log.user_agent || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">User ID:</span>{' '}
                            <span className="font-mono text-muted-foreground">
                              {log.user_id}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Tenant ID:</span>{' '}
                            <span className="font-mono text-muted-foreground">
                              {log.tenant_id || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
