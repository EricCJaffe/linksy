'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, GripVertical, Pencil, Check, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useStatusReasons,
  useCreateStatusReason,
  useUpdateStatusReason,
  useDeleteStatusReason,
} from '@/lib/hooks/useStatusReasons'
import type { TicketStatus } from '@/lib/types/linksy'

const statusesWithReasons: { value: TicketStatus; label: string }[] = [
  { value: 'unable_to_assist', label: 'Unable to Assist' },
  { value: 'outside_of_scope', label: 'Out of Scope' },
  { value: 'client_not_eligible', label: 'Not Eligible' },
  { value: 'wrong_organization_referred', label: 'Wrong Org Referred' },
  { value: 'client_unresponsive', label: 'Unresponsive' },
]

export function ReferralSettingsTab() {
  const [selectedStatus, setSelectedStatus] = useState<string>('unable_to_assist')
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const { data: reasons, isLoading } = useStatusReasons(selectedStatus)
  const createReason = useCreateStatusReason()
  const updateReason = useUpdateStatusReason()
  const deleteReason = useDeleteStatusReason()

  const handleAdd = () => {
    if (!newLabel.trim()) return
    createReason.mutate(
      { parent_status: selectedStatus, label: newLabel.trim() },
      { onSuccess: () => setNewLabel('') }
    )
  }

  const handleSaveEdit = (id: string) => {
    if (!editLabel.trim()) return
    updateReason.mutate(
      { id, label: editLabel.trim() },
      { onSuccess: () => setEditingId(null) }
    )
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateReason.mutate({ id, is_active: !isActive })
  }

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Delete "${label}"? Any tickets using this reason will have it cleared.`)) return
    deleteReason.mutate(id)
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Referral Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure status reasons that appear when a referral status is selected
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Sub-Reasons</CardTitle>
          <CardDescription>
            When a provider selects a status like &ldquo;Unable to Assist&rdquo;, they can also specify a reason.
            Add, edit, or disable reasons for each status below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium whitespace-nowrap">Status:</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusesWithReasons.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {reasons && reasons.length > 0 ? (
                reasons.map((reason) => (
                  <div
                    key={reason.id}
                    className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

                    {editingId === reason.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(reason.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(reason.id)}
                          disabled={updateReason.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm ${!reason.is_active ? 'text-muted-foreground line-through' : ''}`}>
                          {reason.label}
                        </span>
                        {!reason.is_active && (
                          <Badge variant="secondary" className="text-xs">Disabled</Badge>
                        )}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={reason.is_active}
                            onCheckedChange={() => handleToggleActive(reason.id, reason.is_active)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(reason.id)
                              setEditLabel(reason.label)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(reason.id, reason.label)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No reasons configured for this status yet.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              placeholder="Add new reason..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              className="flex-1"
            />
            <Button
              onClick={handleAdd}
              disabled={!newLabel.trim() || createReason.isPending}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
