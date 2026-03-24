import Anthropic from '@anthropic-ai/sdk'
import { Octokit } from '@octokit/rest'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'
import type { TriageResult } from '@/lib/utils/ai-triage'

interface RemediationInput {
  ticketId: string
  ticketNumber: string
  subject: string
  description: string
  triage: TriageResult
  approvedBy: string
}

interface FileChange {
  path: string
  content: string
  original_content?: string
}

interface RemediationResult {
  files_changed: { path: string; summary: string }[]
  commit_message: string
  summary: string
  model_used: string
  pr_url?: string
  branch?: string
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured')
  return new Anthropic({ apiKey: key })
}

function getOctokit() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not configured')
  return new Octokit({ auth: token })
}

function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const baseBranch = process.env.GITHUB_BASE_BRANCH || 'main'
  if (!owner || !repo) throw new Error('GITHUB_OWNER and GITHUB_REPO must be configured')
  return { owner, repo, baseBranch }
}

/**
 * Run the full AI remediation pipeline:
 * 1. Read affected files from GitHub
 * 2. Send to Claude with the remediation prompt
 * 3. Create a branch + commit + PR on GitHub
 * 4. Update the ticket and notify admin
 */
export async function remediateSupportTicket(input: RemediationInput): Promise<RemediationResult> {
  const supabase = await createServiceClient()
  const { ticketId } = input

  // Mark as generating
  await supabase
    .from('linksy_support_tickets')
    .update({ remediation_status: 'generating' })
    .eq('id', ticketId)

  try {
    const octokit = getOctokit()
    const { owner, repo, baseBranch } = getRepoConfig()

    // 1. Read affected files from GitHub
    const fileContents = await readFilesFromGitHub(octokit, owner, repo, baseBranch, input.triage.affected_areas)

    // 2. Generate fix using Claude
    const { changes, commit_message, summary } = await generateFix(input, fileContents)

    if (changes.length === 0) {
      throw new Error('Claude did not suggest any file changes')
    }

    // 3. Create branch, commit, and PR
    const branchName = `fix/support-${input.ticketNumber.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`
    const prUrl = await createPullRequest(octokit, owner, repo, baseBranch, branchName, changes, commit_message, input)

    const result: RemediationResult = {
      files_changed: changes.map((c) => ({
        path: c.path,
        summary: `Modified ${c.path}`,
      })),
      commit_message,
      summary,
      model_used: 'claude-sonnet-4-20250514',
      pr_url: prUrl,
      branch: branchName,
    }

    // 4. Update ticket
    await supabase
      .from('linksy_support_tickets')
      .update({
        remediation_status: 'pr_created',
        remediation_pr_url: prUrl,
        remediation_branch: branchName,
        remediation_result: result,
      })
      .eq('id', ticketId)

    // 5. Notify admin
    void sendRemediationEmail(input, result)

    return result
  } catch (err) {
    console.error('Remediation failed:', err)

    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    await supabase
      .from('linksy_support_tickets')
      .update({
        remediation_status: 'failed',
        remediation_result: { error: errorMessage },
      })
      .eq('id', ticketId)

    throw err
  }
}

async function readFilesFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  filePaths: string[]
): Promise<Map<string, string>> {
  const contents = new Map<string, string>()

  for (const filePath of filePaths) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref,
      })

      if ('content' in data && data.type === 'file') {
        const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
        contents.set(filePath, decoded)
      }
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 404) {
        // File doesn't exist — Claude may have guessed wrong, skip it
        console.warn(`File not found on GitHub: ${filePath}`)
      } else {
        throw err
      }
    }
  }

  return contents
}

async function generateFix(
  input: RemediationInput,
  fileContents: Map<string, string>
): Promise<{ changes: FileChange[]; commit_message: string; summary: string }> {
  const anthropic = getAnthropic()

  // Build file context
  const fileContext = Array.from(fileContents.entries())
    .map(([path, content]) => `### File: ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `You are fixing a bug/issue in the Linksy platform codebase.

## Support Ticket: ${input.ticketNumber}
**Subject:** ${input.subject}
**Description:** ${input.description}

## AI Triage Analysis
**Classification:** ${input.triage.classification}
**Severity:** ${input.triage.severity}
**Root Cause:** ${input.triage.root_cause_hypothesis}
**Suggested Fix:** ${input.triage.suggested_fix}

## Remediation Prompt from Triage
${input.triage.remediation_prompt}

## Current Source Files
${fileContext || 'No files could be read. Suggest the minimal changes needed based on the triage analysis.'}

## Instructions
Analyze the issue and provide a fix. Return ONLY valid JSON with this structure:

{
  "changes": [
    {
      "path": "relative/file/path.ts",
      "content": "complete new file content with the fix applied"
    }
  ],
  "commit_message": "fix(scope): brief description of fix",
  "summary": "2-3 sentence summary of what was changed and why"
}

Rules:
- Only change files that need to be changed
- Return the COMPLETE file content for each changed file (not just diffs)
- Use Conventional Commits format for the commit message
- Keep changes minimal and focused on the issue
- Do NOT change unrelated code
- Ensure TypeScript types are correct
- Follow existing code patterns and conventions`,
      },
    ],
  })

  // Extract text content from response
  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text response')
  }

  // Parse JSON from the response (handle markdown code blocks)
  let jsonStr = textBlock.text.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  const result = JSON.parse(jsonStr) as {
    changes: FileChange[]
    commit_message: string
    summary: string
  }

  return result
}

async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseBranch: string,
  branchName: string,
  changes: FileChange[],
  commitMessage: string,
  input: RemediationInput
): Promise<string> {
  // Get the base branch SHA
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  })
  const baseSha = ref.object.sha

  // Create the branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })

  // Create a tree with the file changes
  const treeItems = changes.map((change) => ({
    path: change.path,
    mode: '100644' as const,
    type: 'blob' as const,
    content: change.content,
  }))

  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseSha,
    tree: treeItems,
  })

  // Create a commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: tree.sha,
    parents: [baseSha],
  })

  // Update the branch to point to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branchName}`,
    sha: commit.sha,
  })

  // Create the pull request
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: `${commitMessage} [${input.ticketNumber}]`,
    body: `## Auto-Remediation for ${input.ticketNumber}

**Support Ticket:** ${input.subject}

### AI Triage Summary
- **Classification:** ${input.triage.classification}
- **Severity:** ${input.triage.severity}
- **Complexity:** ${input.triage.estimated_complexity}

### Root Cause
${input.triage.root_cause_hypothesis}

### What Changed
${changes.map((c) => `- \`${c.path}\``).join('\n')}

### Summary
${input.triage.suggested_fix}

---
*This PR was auto-generated by Linksy's AI remediation system. Please review carefully before merging.*`,
    head: branchName,
    base: baseBranch,
  })

  return pr.html_url
}

async function sendRemediationEmail(
  input: RemediationInput,
  result: RemediationResult
) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #111827;">AI Fix Ready for Review: ${escHtml(input.ticketNumber)}</h2>
      <p style="color: #6b7280; font-size: 14px;">${escHtml(input.subject)}</p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: #166534; margin-top: 0;">Pull Request Created</h3>
        <p style="margin: 0;">
          <a href="${result.pr_url}" style="color: #2563eb; font-weight: 600; font-size: 15px;">
            ${escHtml(result.commit_message)}
          </a>
        </p>
        <p style="color: #374151; font-size: 14px; margin-top: 8px;">
          Branch: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${escHtml(result.branch || '')}</code>
        </p>
      </div>

      <h3 style="color: #111827;">Summary</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">${escHtml(result.summary)}</p>

      <h3 style="color: #111827;">Files Changed</h3>
      <ul style="color: #374151; font-size: 13px; font-family: 'SF Mono', Monaco, monospace;">
        ${result.files_changed.map((f) => `<li>${escHtml(f.path)}</li>`).join('')}
      </ul>

      <div style="margin-top: 24px;">
        <a href="${result.pr_url}"
           style="display: inline-block; background: #16a34a; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Review & Merge PR
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Generated by ${escHtml(appName)}'s AI remediation system using ${result.model_used}.
        Please review all changes before merging.
      </p>
    </div>
  `

  try {
    await sendEmail({
      to: adminEmail,
      subject: `[PR Ready] AI Fix: ${input.ticketNumber} — ${input.subject}`,
      html,
    })
  } catch (err) {
    console.error('Failed to send remediation email:', err)
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
