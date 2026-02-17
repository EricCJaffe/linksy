'use client'

import { useState } from 'react'
import {
  useCrisisKeywords,
  useCreateCrisisKeyword,
  useUpdateCrisisKeyword,
  useDeactivateCrisisKeyword,
  useTestCrisis,
} from '@/lib/hooks/useCrisisKeywords'
import type { CrisisKeyword, CrisisType, CrisisSeverity, EmergencyResource } from '@/lib/types/linksy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Plus, Pencil, AlertTriangle, FlaskConical } from 'lucide-react'

// The primary operating site
const PRIMARY_SITE_ID = '86bd8d01-0dc5-4479-beff-666712654104'

const CRISIS_TYPE_LABELS: Record<CrisisType, string> = {
  suicide: 'Suicide / Self-harm',
  domestic_violence: 'Domestic Violence',
  trafficking: 'Human Trafficking',
  child_abuse: 'Child Abuse',
}

const CRISIS_TYPE_COLORS: Record<CrisisType, string> = {
  suicide: 'bg-red-100 text-red-800 border-red-200',
  domestic_violence: 'bg-orange-100 text-orange-800 border-orange-200',
  trafficking: 'bg-purple-100 text-purple-800 border-purple-200',
  child_abuse: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

const SEVERITY_COLORS: Record<CrisisSeverity, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-blue-400 text-white',
}

interface KeywordFormState {
  keyword: string
  crisis_type: CrisisType
  severity: CrisisSeverity
  response_template: string
  emergency_resources: EmergencyResource[]
  is_active: boolean
}

const defaultForm: KeywordFormState = {
  keyword: '',
  crisis_type: 'suicide',
  severity: 'high',
  response_template: '',
  emergency_resources: [],
  is_active: true,
}

export default function CrisisDetectionPage() {
  const { data: keywords, isLoading } = useCrisisKeywords(PRIMARY_SITE_ID)
  const createKeyword = useCreateCrisisKeyword()
  const updateKeyword = useUpdateCrisisKeyword()
  const deactivateKeyword = useDeactivateCrisisKeyword()
  const testCrisis = useTestCrisis()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<CrisisKeyword | null>(null)
  const [form, setForm] = useState<KeywordFormState>(defaultForm)

  // Resource editor state (inline JSON editing via structured form)
  const [resourceJson, setResourceJson] = useState('')
  const [resourceJsonError, setResourceJsonError] = useState('')

  // Test input
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState<{ detected: boolean; result: any } | null>(null)

  // Filter
  const [filterType, setFilterType] = useState<CrisisType | 'all'>('all')
  const [showInactive, setShowInactive] = useState(false)

  function openAdd() {
    setEditItem(null)
    setForm(defaultForm)
    setResourceJson('[]')
    setResourceJsonError('')
    setDialogOpen(true)
  }

  function openEdit(kw: CrisisKeyword) {
    setEditItem(kw)
    setForm({
      keyword: kw.keyword,
      crisis_type: kw.crisis_type,
      severity: kw.severity,
      response_template: kw.response_template || '',
      emergency_resources: kw.emergency_resources,
      is_active: kw.is_active,
    })
    setResourceJson(JSON.stringify(kw.emergency_resources, null, 2))
    setResourceJsonError('')
    setDialogOpen(true)
  }

  function handleResourceJsonChange(val: string) {
    setResourceJson(val)
    try {
      const parsed = JSON.parse(val)
      if (!Array.isArray(parsed)) throw new Error('Must be an array')
      setForm((f) => ({ ...f, emergency_resources: parsed }))
      setResourceJsonError('')
    } catch (e: any) {
      setResourceJsonError(e.message)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (resourceJsonError) return

    const payload = {
      site_id: PRIMARY_SITE_ID,
      keyword: form.keyword,
      crisis_type: form.crisis_type,
      severity: form.severity,
      response_template: form.response_template || null,
      emergency_resources: form.emergency_resources,
      is_active: form.is_active,
    }

    if (editItem) {
      await updateKeyword.mutateAsync({ id: editItem.id, ...payload })
    } else {
      await createKeyword.mutateAsync(payload as any)
    }
    setDialogOpen(false)
  }

  async function handleRunTest() {
    if (!testMessage.trim()) return
    const result = await testCrisis.mutateAsync({ message: testMessage, site_id: PRIMARY_SITE_ID })
    setTestResult(result)
  }

  const isMutating = createKeyword.isPending || updateKeyword.isPending || deactivateKeyword.isPending

  const filtered = (keywords || []).filter((kw) => {
    if (!showInactive && !kw.is_active) return false
    if (filterType !== 'all' && kw.crisis_type !== filterType) return false
    return true
  })

  // Group by crisis type for summary counts
  const counts = (keywords || []).reduce(
    (acc, kw) => {
      if (kw.is_active) acc[kw.crisis_type] = (acc[kw.crisis_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crisis Detection</h1>
          <p className="text-sm text-muted-foreground">
            Keywords that trigger emergency resource banners in the public widget
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Keyword
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(CRISIS_TYPE_LABELS) as CrisisType[]).map((type) => (
          <Card
            key={type}
            className={`cursor-pointer border ${CRISIS_TYPE_COLORS[type]} ${filterType === type ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
            onClick={() => setFilterType(filterType === type ? 'all' : type)}
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium">{CRISIS_TYPE_LABELS[type]}</p>
              <p className="text-2xl font-bold">{counts[type] || 0}</p>
              <p className="text-xs opacity-70">active keywords</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" />
            Test Crisis Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={testMessage}
              onChange={(e) => {
                setTestMessage(e.target.value)
                setTestResult(null)
              }}
              placeholder="Type a message to test, e.g. 'I want to die'"
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleRunTest}
              disabled={!testMessage.trim() || testCrisis.isPending}
            >
              {testCrisis.isPending ? 'Testing...' : 'Test'}
            </Button>
          </div>
          {testResult !== null && (
            <div className={`mt-3 rounded-md p-3 ${testResult.detected ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              {testResult.detected ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-sm font-semibold text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Crisis detected: {CRISIS_TYPE_LABELS[testResult.result.crisis_type as CrisisType]}
                  </p>
                  <p className="text-xs text-red-600">
                    Matched keyword: <span className="font-mono font-semibold">&ldquo;{testResult.result.matched_keyword}&rdquo;</span>
                    {' '}· Severity: <span className="font-semibold">{testResult.result.severity}</span>
                  </p>
                  {testResult.result.response_template && (
                    <p className="text-xs text-red-700 italic mt-1">{testResult.result.response_template}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-green-700">No crisis keywords detected in this message.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyword Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.keys(CRISIS_TYPE_LABELS) as CrisisType[]).map((t) => (
                <SelectItem key={t} value={t}>{CRISIS_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive" className="text-sm">Show inactive</Label>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded bg-muted" />)}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Crisis Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No keywords found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((kw) => (
                    <TableRow key={kw.id} className={!kw.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">{kw.keyword}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${CRISIS_TYPE_COLORS[kw.crisis_type]}`}>
                          {CRISIS_TYPE_LABELS[kw.crisis_type]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[kw.severity]}`}>
                          {kw.severity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {kw.emergency_resources.length > 0
                          ? kw.emergency_resources.map((r) => r.name).join(', ')
                          : <span className="italic">None configured</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={kw.is_active ? 'default' : 'secondary'}>
                          {kw.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(kw)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Keyword' : 'Add Crisis Keyword'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword / Phrase</Label>
              <Input
                id="keyword"
                value={form.keyword}
                onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                placeholder="e.g. want to die"
                className="font-mono"
                required
              />
              <p className="text-xs text-muted-foreground">Matching is case-insensitive. Saved lowercase.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Crisis Type</Label>
                <Select
                  value={form.crisis_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, crisis_type: v as CrisisType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CRISIS_TYPE_LABELS) as CrisisType[]).map((t) => (
                      <SelectItem key={t} value={t}>{CRISIS_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm((f) => ({ ...f, severity: v as CrisisSeverity }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="response_template">Response Message</Label>
              <Textarea
                id="response_template"
                value={form.response_template}
                onChange={(e) => setForm((f) => ({ ...f, response_template: e.target.value }))}
                placeholder="Compassionate message shown above emergency resources..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_resources">Emergency Resources (JSON array)</Label>
              <Textarea
                id="emergency_resources"
                value={resourceJson}
                onChange={(e) => handleResourceJsonChange(e.target.value)}
                className="font-mono text-xs"
                rows={6}
                placeholder={'[{"name":"...", "phone":"...", "url":"...", "description":"..."}]'}
              />
              {resourceJsonError && (
                <p className="text-xs text-destructive">JSON error: {resourceJsonError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Each resource: name, phone, url, description
              </p>
            </div>

            {editItem && (
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating || !!resourceJsonError}>
                {isMutating ? 'Saving...' : editItem ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
