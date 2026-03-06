'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ChevronLeft, ChevronRight, Users, ExternalLink } from 'lucide-react'

const LIMIT = 50

interface Contact {
  id: string
  provider_id: string
  user_id: string | null
  email: string | null
  full_name: string | null
  job_title: string | null
  phone: string | null
  contact_type: string
  provider_role: string
  is_primary_contact: boolean
  is_default_referral_handler: boolean
  status: string
  created_at: string
  display_name: string
  display_email: string | null
  provider: {
    id: string
    name: string
    is_active: boolean
  } | null
}

interface ContactsResponse {
  contacts: Contact[]
  pagination: { total: number; offset: number; limit: number }
}

export default function ContactsPage() {
  const router = useRouter()
  const [data, setData] = useState<ContactsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [providerFilter, setProviderFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([])

  // Fetch provider list for filter
  useEffect(() => {
    fetch('/api/providers?limit=200')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.providers) {
          setProviders(data.providers.map((p: any) => ({ id: p.id, name: p.name })))
        }
      })
      .catch(() => {})
  }, [])

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: LIMIT.toString(),
        status: statusFilter,
      })
      if (search) params.set('q', search)
      if (providerFilter) params.set('provider_id', providerFilter)
      if (roleFilter) params.set('role', roleFilter)

      const res = await fetch(`/api/contacts?${params.toString()}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    } finally {
      setLoading(false)
    }
  }, [offset, search, statusFilter, providerFilter, roleFilter])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const total = data?.pagination.total || 0
  const contacts = data?.contacts || []
  const showingFrom = total > 0 ? offset + 1 : 0
  const showingTo = Math.min(offset + LIMIT, total)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          All provider contacts across organizations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{total} contact{total !== 1 ? 's' : ''}</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, title..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setOffset(0)
                  }}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setOffset(0)
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={providerFilter || 'all'}
                onValueChange={(v) => {
                  setProviderFilter(v === 'all' ? '' : v)
                  setOffset(0)
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={roleFilter || 'all'}
                onValueChange={(v) => {
                  setRoleFilter(v === 'all' ? '' : v)
                  setOffset(0)
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No contacts found.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (contact.provider_id) {
                          router.push(`/dashboard/providers/${contact.provider_id}?tab=contacts`)
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {contact.display_name}
                          {contact.is_primary_contact && (
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          )}
                          {contact.is_default_referral_handler && (
                            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">Handler</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.display_email || '—'}
                      </TableCell>
                      <TableCell>
                        {contact.provider ? (
                          <div className="flex items-center gap-1.5">
                            <span>{contact.provider.name}</span>
                            {!contact.provider.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.job_title || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={contact.provider_role === 'admin' ? 'default' : 'secondary'}>
                          {contact.provider_role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contact.status === 'active' ? 'default' :
                            contact.status === 'invited' ? 'outline' :
                            contact.status === 'pending' ? 'outline' :
                            'secondary'
                          }
                          className={
                            contact.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                            contact.status === 'invited' ? 'border-blue-200 text-blue-700' :
                            ''
                          }
                        >
                          {contact.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {showingFrom}–{showingTo} of {total} contact{total !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={offset + LIMIT >= total}
                    onClick={() => setOffset(offset + LIMIT)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
