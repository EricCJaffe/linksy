import OpenAI from 'openai'
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

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  return new OpenAI({ apiKey: key })
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
 * Static project conventions baked into the system prompt.
 * This is derived from CLAUDE.md but lives here as a constant
 * so we don't need an extra GitHub API call on every remediation.
 */
const PROJECT_CONVENTIONS = `
## Linksy Project — Architecture & Conventions

### Platform
AI-powered community resource search and referral platform (Clay County, FL).
Multi-tenant SaaS: Site (Impact Works) → Tenants (regions) → Providers → Locations.
Domain tables prefixed \`linksy_*\`.

### Tech Stack
- Next.js 14 App Router, TypeScript strict mode
- Supabase (PostgreSQL + pgvector + PostGIS)
- OpenAI (text-embedding-3-small + gpt-4o-mini)
- Tailwind CSS + shadcn/ui components
- React Query v5 for data fetching
- React Hook Form + Zod for forms
- Vercel deployment

### CRITICAL: Next.js App Router File Conventions
- Page files: \`page.tsx\` (NEVER \`index.tsx\` for pages)
- Layout files: \`layout.tsx\`
- API routes: \`app/api/**/route.ts\`
- Server Components are the default — only add "use client" when needed
- NEVER use Pages Router patterns (getServerSideProps, _app.tsx, etc.)

### CRITICAL: Styling Rules
- ALWAYS use Tailwind utility classes (e.g., \`className="bg-red-600 text-white px-6 py-3 rounded-lg"\`)
- Use \`cn()\` from \`lib/utils\` for conditional classes
- NEVER inject raw CSS via <style> tags, document.createElement("style"), or CSS modules
- NEVER use inline style objects unless absolutely necessary
- Use shadcn/ui components from \`components/ui/\` (Button, Card, Dialog, etc.)
- Import example: \`import { Button } from "@/components/ui/button"\`

### Code Patterns
- Module imports use \`@/\` path alias (e.g., \`@/components/ui/button\`)
- Don't use \`React.FC\` — use plain function components with typed props
- Supabase: \`createClient()\` respects RLS, \`createServiceClient()\` bypasses RLS
- Data fetching: React Query hooks wrapping fetch() calls
- Conventional Commits for commit messages

### Key Directory Structure
- \`app/dashboard/page.tsx\` — Admin dashboard main page
- \`app/dashboard/admin/\` — Site admin pages
- \`app/api/\` — API routes
- \`app/find-help/\` — Public search widget
- \`components/\` — React components (ui/, providers/, tickets/, admin/, support/)
- \`lib/hooks/\` — React Query hooks
- \`lib/utils/\` — Utilities
- \`lib/types/\` — TypeScript type definitions

### File Modification Rules
- ONLY modify files that exist — do NOT create new files at guessed paths
- When modifying a file, return its COMPLETE content (not just the diff)
- Preserve ALL existing imports, exports, and functionality
- Only change what's needed for the fix
`

/**
 * Run the full AI remediation pipeline:
 * 1. Read affected files from GitHub
 * 2. Send to OpenAI with the remediation prompt + project conventions
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

    // 2. Generate fix using OpenAI
    const { changes, commit_message, summary } = await generateFix(input, fileContents)

    if (changes.length === 0) {
      throw new Error('OpenAI did not suggest any file changes')
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
      model_used: 'gpt-4o',
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

/**
 * Read files from GitHub, with automatic fallback for common path mistakes.
 * If triage suggests "app/dashboard/index.tsx" but it doesn't exist,
 * tries "app/dashboard/page.tsx" instead.
 */
async function readFilesFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  filePaths: string[]
): Promise<Map<string, string>> {
  const contents = new Map<string, string>()

  for (const filePath of filePaths) {
    const pathsToTry = [filePath]

    // Add fallback paths for common mistakes
    if (filePath.includes('index.tsx')) {
      pathsToTry.push(filePath.replace('index.tsx', 'page.tsx'))
    }
    if (filePath.includes('index.ts') && !filePath.includes('index.tsx')) {
      pathsToTry.push(filePath.replace('index.ts', 'route.ts'))
    }

    let found = false
    for (const tryPath of pathsToTry) {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: tryPath,
          ref,
        })

        if ('content' in data && data.type === 'file') {
          const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
          contents.set(tryPath, decoded)
          found = true
          break
        }
      } catch (err: unknown) {
        const status = (err as { status?: number }).status
        if (status === 404) {
          continue // Try the next fallback path
        }
        throw err
      }
    }

    if (!found) {
      console.warn(`File not found on GitHub (tried ${pathsToTry.join(', ')}): ${filePath}`)
    }
  }

  return contents
}

async function generateFix(
  input: RemediationInput,
  fileContents: Map<string, string>
): Promise<{ changes: FileChange[]; commit_message: string; summary: string }> {
  const openai = getOpenAI()

  // Build file context
  const fileContext = Array.from(fileContents.entries())
    .map(([path, content]) => `### File: ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n')

  // List which files were actually read so the AI knows what exists
  const readFiles = Array.from(fileContents.keys())
  const readFilesNote = readFiles.length > 0
    ? `Files successfully read from the repository: ${readFiles.join(', ')}`
    : 'WARNING: No files could be read from the repository. The triage may have suggested incorrect paths.'

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert software engineer fixing issues in a production codebase.
You will be given project conventions, a support ticket with triage analysis, and the current source files.
Generate a minimal, correct fix and return ONLY valid JSON.

${PROJECT_CONVENTIONS}`,
      },
      {
        role: 'user',
        content: `## Support Ticket: ${input.ticketNumber}
**Subject:** ${input.subject}
**Description:** ${input.description}

## AI Triage Analysis
**Classification:** ${input.triage.classification}
**Severity:** ${input.triage.severity}
**Root Cause:** ${input.triage.root_cause_hypothesis}
**Suggested Fix:** ${input.triage.suggested_fix}

## Remediation Prompt from Triage
${input.triage.remediation_prompt}

## ${readFilesNote}

## Current Source Files
${fileContext || 'No files could be read. You MUST only suggest changes to files listed in the triage affected areas, using the correct App Router file names (page.tsx, not index.tsx).'}

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
- ONLY modify files that were successfully read above — use the exact same paths
- Return the COMPLETE file content for each changed file (not just diffs)
- Preserve ALL existing code — only change what's needed for the fix
- Use Tailwind CSS classes for styling (NEVER raw CSS or style injection)
- Use shadcn/ui components (Button, Card, etc.) where appropriate
- Use Next.js App Router patterns (page.tsx, not index.tsx)
- Use Conventional Commits format for the commit message
- Keep changes minimal and focused on the issue
- Ensure TypeScript strict mode compliance
- Do NOT change unrelated code`,
      },
    ],
    max_tokens: 16000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned empty response')
  }

  const result = JSON.parse(content) as {
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
