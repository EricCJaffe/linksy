'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  useTriggerSupportTicketTriage,
  useApproveRemediation,
} from '@/lib/hooks/useSupportTickets'
import {
  Brain,
  Copy,
  Check,
  RefreshCw,
  FileCode,
  Target,
  Loader2,
  Wrench,
  ExternalLink,
  GitPullRequest,
} from 'lucide-react'
import type {
  SupportTicketTriage,
  SupportTicketTriageStatus,
  SupportTicketRemediationStatus,
  SupportTicketRemediationResult,
} from '@/lib/types/linksy'

const severityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const complexityColors: Record<string, string> = {
  trivial: 'bg-green-100 text-green-700',
  small: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  large: 'bg-red-100 text-red-700',
}

function TriageStatusBadge({ status }: { status: SupportTicketTriageStatus }) {
  const styles: Record<SupportTicketTriageStatus, string> = {
    pending: 'bg-gray-100 text-gray-600',
    analyzing: 'bg-purple-100 text-purple-700',
    complete: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-500',
  }
  return <Badge className={styles[status]}>{status}</Badge>
}

function RemediationStatusSection({
  status,
  result,
  prUrl,
  branch,
  ticketId,
}: {
  status: SupportTicketRemediationStatus
  result: SupportTicketRemediationResult | null
  prUrl: string | null
  branch: string | null
  ticketId: string
}) {
  const approveRemediation = useApproveRemediation()

  // Show spinner while the mutation is in-flight (API call takes 15-30s)
  if (status === 'none' && approveRemediation.isPending) {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-green-600" />
          <div>
            <h4 className="text-sm font-semibold">Generating Fix...</h4>
            <p className="text-xs text-muted-foreground">
              AI is reading the source files and generating a fix. This may take 15-30 seconds.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'none') {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Auto-Remediation
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Approve to have AI generate a fix and create a pull request automatically.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Wrench className="h-4 w-4 mr-1.5" />
                Approve Fix
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve AI Remediation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will use AI to analyze the affected source files, generate a fix,
                  and create a pull request on GitHub. You will review and merge the PR manually.
                  <br /><br />
                  <strong>This does NOT deploy anything automatically.</strong> The fix will be
                  on a separate branch for your review.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => approveRemediation.mutate(ticketId)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve & Generate Fix
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {approveRemediation.isError && (
          <p className="text-sm text-destructive mt-2">
            {approveRemediation.error.message}
          </p>
        )}
      </div>
    )
  }

  if (status === 'approved' || status === 'generating') {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-green-600" />
          <div>
            <h4 className="text-sm font-semibold">Generating Fix...</h4>
            <p className="text-xs text-muted-foreground">
              Claude is reading the source files and generating a fix. This may take 15-30 seconds.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'pr_created' && prUrl) {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                <GitPullRequest className="h-4 w-4" />
                Pull Request Created
              </h4>
              {branch && (
                <p className="text-xs text-green-700 mt-1">
                  Branch: <code className="bg-green-100 px-1.5 py-0.5 rounded">{branch}</code>
                </p>
              )}
              {result?.summary && (
                <p className="text-sm text-green-800 mt-2">{result.summary}</p>
              )}
              {result?.files_changed && result.files_changed.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-green-700 font-medium">Files changed:</p>
                  <ul className="text-xs text-green-700 font-mono mt-1 space-y-0.5">
                    {result.files_changed.map((f) => (
                      <li key={f.path}>{f.path}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Review PR
              </Button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'merged') {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
            <Check className="h-4 w-4" />
            Fix Merged
          </h4>
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:underline mt-1 inline-block"
            >
              View PR
            </a>
          )}
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="border-t pt-4 mt-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />
            Remediation Failed
          </h4>
          {result?.error && (
            <p className="text-sm text-red-700 mt-1">{result.error}</p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => approveRemediation.mutate(ticketId)}
            disabled={approveRemediation.isPending}
          >
            {approveRemediation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return null
}

interface TriageCardProps {
  triage: SupportTicketTriage | null
  triageStatus: SupportTicketTriageStatus
  ticketId: string
  remediationStatus?: SupportTicketRemediationStatus
  remediationResult?: SupportTicketRemediationResult | null
  remediationPrUrl?: string | null
  remediationBranch?: string | null
}

export function TriageCard({
  triage,
  triageStatus,
  ticketId,
  remediationStatus = 'none',
  remediationResult = null,
  remediationPrUrl = null,
  remediationBranch = null,
}: TriageCardProps) {
  const [copied, setCopied] = useState(false)
  const triggerTriage = useTriggerSupportTicketTriage()

  const handleCopyPrompt = async () => {
    if (!triage?.remediation_prompt) return
    try {
      await navigator.clipboard.writeText(triage.remediation_prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = triage.remediation_prompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRunTriage = () => {
    triggerTriage.mutate(ticketId)
  }

  // No triage yet — show run button
  if (!triage && (triageStatus === 'pending' || triageStatus === 'failed')) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>AI Triage</CardTitle>
              <TriageStatusBadge status={triageStatus} />
            </div>
            <Button
              onClick={handleRunTriage}
              disabled={triggerTriage.isPending}
              size="sm"
            >
              {triggerTriage.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Run AI Triage
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {triageStatus === 'failed'
              ? 'AI triage failed. Click "Run AI Triage" to retry.'
              : 'AI triage has not run yet. Click "Run AI Triage" to analyze this ticket.'}
          </p>
          {triggerTriage.isError && (
            <p className="text-sm text-destructive mt-2">
              {triggerTriage.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Currently analyzing
  if (triageStatus === 'analyzing') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle>AI Triage</CardTitle>
            <TriageStatusBadge status="analyzing" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <p className="text-sm text-muted-foreground">
              AI is analyzing this ticket... This typically takes 5-10 seconds.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!triage) return null

  // Triage complete — full analysis display
  return (
    <Card className="border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle>AI Triage Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {Math.round(triage.confidence * 100)}% confidence
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRunTriage}
              disabled={triggerTriage.isPending}
              title="Re-run AI triage"
            >
              {triggerTriage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Classification badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={severityColors[triage.severity] || 'bg-gray-100'}>
            {triage.severity.toUpperCase()}
          </Badge>
          <Badge variant="outline">{triage.classification}</Badge>
          <Badge className={complexityColors[triage.estimated_complexity] || 'bg-gray-100'}>
            {triage.estimated_complexity} complexity
          </Badge>
        </div>

        {/* Root cause */}
        <div>
          <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-muted-foreground" />
            Root Cause Hypothesis
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {triage.root_cause_hypothesis}
          </p>
        </div>

        {/* Suggested fix */}
        <div>
          <h4 className="text-sm font-semibold mb-1">Suggested Fix</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {triage.suggested_fix}
          </p>
        </div>

        {/* Affected areas */}
        <div>
          <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            Affected Areas
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {triage.affected_areas.map((area) => (
              <code
                key={area}
                className="text-xs bg-muted px-2 py-0.5 rounded font-mono"
              >
                {area}
              </code>
            ))}
          </div>
        </div>

        {/* Investigation steps */}
        <div>
          <h4 className="text-sm font-semibold mb-1.5">Investigation Steps</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            {triage.investigation_steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Remediation prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Remediation Prompt</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPrompt}
              className="h-7"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Prompt
                </>
              )}
            </Button>
          </div>
          <div className="bg-[#1e1e2e] text-[#cdd6f4] rounded-lg p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
            {triage.remediation_prompt}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Paste this prompt into Claude Code to investigate and fix the issue.
          </p>
        </div>

        {/* Auto-Remediation Section */}
        <RemediationStatusSection
          status={remediationStatus}
          result={remediationResult}
          prUrl={remediationPrUrl}
          branch={remediationBranch}
          ticketId={ticketId}
        />
      </CardContent>
    </Card>
  )
}
