'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle } from 'lucide-react'

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  case_a: { label: 'High Volume (5+ same day)', color: 'border-red-200 bg-red-50 text-red-700' },
  case_b: { label: 'Exact Duplicate', color: 'border-orange-200 bg-orange-50 text-orange-700' },
  case_c: { label: 'Consecutive Day', color: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_process: 'In Process',
  customer_need_addressed: 'Service Provided',
  wrong_organization_referred: 'Wrong Org',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
  transferred_another_provider: 'Transferred',
  transferred_pending: 'Transferred Pending',
}

interface DuplicateTicket {
  id: string
  ticket_number: string
  status: string
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  duplicate_flag_type: 'case_a' | 'case_b' | 'case_c'
  created_at: string
  provider: { id: string; name: string } | null
  need: { id: string; name: string } | null
}

export default function DuplicatesPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<DuplicateTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/referrals/duplicates')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data) => setTickets(data.tickets || []))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  const caseACounts = tickets.filter((t) => t.duplicate_flag_type === 'case_a').length
  const caseBCounts = tickets.filter((t) => t.duplicate_flag_type === 'case_b').length
  const caseCCounts = tickets.filter((t) => t.duplicate_flag_type === 'case_c').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          Potential Duplicate Referrals
        </h1>
        <p className="text-sm text-muted-foreground">
          Referrals flagged by duplicate detection rules
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Exact Duplicates</p>
            <p className="text-2xl font-bold text-orange-600">{caseBCounts}</p>
            <p className="text-xs text-muted-foreground">Same client + provider + service + day</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">High Volume</p>
            <p className="text-2xl font-bold text-red-600">{caseACounts}</p>
            <p className="text-xs text-muted-foreground">5+ providers same service same day</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Consecutive Day</p>
            <p className="text-2xl font-bold text-yellow-600">{caseCCounts}</p>
            <p className="text-xs text-muted-foreground">Same provider on consecutive days</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referral #</TableHead>
              <TableHead>Flag Type</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No duplicate-flagged referrals found.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const flag = FLAG_LABELS[ticket.duplicate_flag_type] || { label: ticket.duplicate_flag_type, color: '' }
                return (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={flag.color}>
                        {flag.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.client_name || ticket.client_email || '-'}</TableCell>
                    <TableCell>{ticket.provider?.name || '-'}</TableCell>
                    <TableCell>{ticket.need?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && tickets.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {tickets.length} flagged referral{tickets.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
