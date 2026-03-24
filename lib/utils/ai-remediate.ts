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
 * Fetch the repo's CLAUDE.md file from GitHub for project context.
 * Returns empty string if not found (non-fatal).
 */
async function fetchProjectContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string
): Promise<string> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'CLAUDE.md',
      ref,
    })
    if ('content' in data && data.type === 'file') {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
  } catch {
    console.warn('Could not fetch CLAUDE.md from GitHub — proceeding without project context')
  }
  return ''
}

/**
 * Fetch the repository file tree (paths only) so the AI knows what files exist.
 * Uses the Git Trees API with recursive=true for a single API call.
 * Returns paths filtered to source code files only.
 */
async function fetchRepoTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string
): Promise<string[]> {
  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${ref}`,
    })
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: refData.object.sha,
      recursive: 'true',
    })

    // Filter to relevant source files only (skip node_modules, .git, dist, etc.)
    const ignoreDirs = ['node_modules/', '.next/', '.git/', 'dist/', '.vercel/', 'coverage/']
    const sourceExts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.sql']

    return tree.tree
      .filter((item) => {
        if (item.type !== 'blob' || !item.path) return false
        if (ignoreDirs.some((d) => item.path!.startsWith(d))) return false
        return sourceExts.some((ext) => item.path!.endsWith(ext))
      })
      .map((item) => item.path!)
  } catch (err) {
    console.warn('Could not fetch repo tree:', err)
    return []
  }
}

/**
 * Resolve triage-suggested file paths against the actual repo tree.
 * If a suggested path doesn't exist, try to find the closest match
 * (e.g., triage says "app/dashboard/index.tsx" but real file is "app/dashboard/page.tsx").
 */
function resolveAffectedFiles(
  suggestedPaths: string[],
  repoTree: string[]
): { resolved: string[]; unresolved: string[] } {
  const treeSet = new Set(repoTree)
  const resolved: string[] = []
  const unresolved: string[] = []

  for (const suggested of suggestedPaths) {
    // Normalize: strip leading slash
    const normalized = suggested.replace(/^\//, '')

    // Exact match
    if (treeSet.has(normalized)) {
      resolved.push(normalized)
      continue
    }

    // Try common substitutions for App Router
    const appRouterVariants = [
      normalized.replace(/index\.(tsx?|jsx?)$/, 'page.$1'),
      normalized.replace(/index\.(tsx?|jsx?)$/, 'layout.$1'),
      normalized.replace(/page\.(tsx?|jsx?)$/, 'index.$1'),
    ]
    const variantMatch = appRouterVariants.find((v) => treeSet.has(v))
    if (variantMatch) {
      resolved.push(variantMatch)
      continue
    }

    // Fuzzy: find files in the same directory or with similar basenames
    const parts = normalized.split('/')
    const basename = parts[parts.length - 1]?.replace(/\.[^.]+$/, '') || ''
    const dir = parts.slice(0, -1).join('/')

    // Look for files in the same directory
    const dirMatches = repoTree.filter((p) => p.startsWith(dir + '/') && !p.slice(dir.length + 1).includes('/'))
    if (dirMatches.length > 0) {
      // Prefer files with similar names
      const nameMatch = dirMatches.find((p) => {
        const pBase = p.split('/').pop()?.replace(/\.[^.]+$/, '') || ''
        return pBase === basename || pBase === 'page' || pBase === 'layout'
      })
      if (nameMatch) {
        resolved.push(nameMatch)
        continue
      }
      // Add the directory's page.tsx as best guess
      const pageFile = dirMatches.find((p) => p.endsWith('/page.tsx') || p.endsWith('/page.ts'))
      if (pageFile) {
        resolved.push(pageFile)
        continue
      }
    }

    unresolved.push(normalized)
  }

  // Deduplicate
  return { resolved: Array.from(new Set(resolved)), unresolved }
}

/** The enriched system prompt with project conventions */
const REMEDIATION_SYSTEM_PROMPT = `You are an expert software engineer fixing issues in the Linksy codebase.
You will be given:
1. The project's CLAUDE.md (coding standards and architecture)
2. The full repository file tree (so you know exactly what files exist)
3. The current contents of affected source files
4. A support ticket with AI triage analysis

Your job: generate the minimal, correct code changes to fix the issue.

## CRITICAL RULES — YOU MUST FOLLOW THESE

### Framework: Next.js 14 App Router
- Route files are named page.tsx (NOT index.tsx)
- Layout files are named layout.tsx
- API routes are in app/api/**/route.ts
- Use "use client" directive ONLY when the component needs browser APIs, state, or event handlers
- Server Components are the default — do NOT add "use client" unless needed
- NEVER use Pages Router patterns (getServerSideProps, _app.tsx, index.tsx for pages)

### Styling: Tailwind CSS + shadcn/ui
- ALWAYS use Tailwind utility classes for styling (e.g., className="bg-red-600 text-white px-6 py-3 rounded-lg")
- Use the cn() utility from lib/utils for conditional classes
- NEVER inject raw CSS via <style> tags, document.createElement("style"), or CSS modules
- NEVER use inline style objects unless absolutely necessary
- Use shadcn/ui components from components/ui/ when available (Button, Card, Dialog, etc.)
- Import shadcn Button like: import { Button } from "@/components/ui/button"

### TypeScript
- Strict mode is enabled — all types must be correct
- Use the project's existing type definitions from lib/types/
- Prefer interface over type for object shapes
- Don't use React.FC — use plain function components

### Code Patterns
- Data fetching: React Query v5 hooks wrapping fetch() calls
- Forms: React Hook Form + Zod validation
- Supabase client: createClient() for RLS-respecting calls, createServiceClient() for admin
- Module imports use @/ path alias (e.g., @/components/ui/button)

### File Modification Rules
- ONLY modify files that already exist in the repository tree (provided below)
- NEVER create files at paths that don't exist unless the fix genuinely requires a new file
- When modifying a file, return the COMPLETE file content (not just the changed parts)
- Preserve all existing imports, exports, and functionality — only change what's needed
- If you cannot find the right file to modify, say so in the summary rather than creating a wrong file

Return ONLY valid JSON.`

/**
 * Run the full AI remediation pipeline:
 * 1. Fetch project context (CLAUDE.md) and repo tree from GitHub
 * 2. Resolve and read affected files from GitHub
 * 3. Send to OpenAI with enriched prompt
 * 4. Validate changes against repo tree
 * 5. Create a branch + commit + PR on GitHub
 * 6. Update the ticket and notify admin
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

    // 1. Fetch project context and repo tree in parallel
    const [projectContext, repoTree] = await Promise.all([
      fetchProjectContext(octokit, owner, repo, baseBranch),
      fetchRepoTree(octokit, owner, repo, baseBranch),
    ])

    // 2. Resolve triage-suggested paths against actual tree
    const { resolved, unresolved } = resolveAffectedFiles(input.triage.affected_areas, repoTree)

    if (unresolved.length > 0) {
      console.warn('Triage suggested paths not found in repo:', unresolved)
    }

    // 3. Read the resolved files from GitHub
    const fileContents = await readFilesFromGitHub(octokit, owner, repo, baseBranch, resolved)

    // 4. Generate fix using OpenAI with full context
    const { changes, commit_message, summary } = await generateFix(
      input,
      fileContents,
      projectContext,
      repoTree,
      unresolved
    )

    if (changes.length === 0) {
      throw new Error('OpenAI did not suggest any file changes')
    }

    // 5. Validate: warn if AI tries to create files at paths not in the tree
    const validatedChanges = changes.map((change) => {
      const inTree = repoTree.includes(change.path)
      if (!inTree) {
        console.warn(`AI suggested creating new file: ${change.path} (not in repo tree)`)
      }
      return change
    })

    // 6. Create branch, commit, and PR
    const branchName = `fix/support-${input.ticketNumber.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`
    const prUrl = await createPullRequest(octokit, owner, repo, baseBranch, branchName, validatedChanges, commit_message, input)

    const result: RemediationResult = {
      files_changed: validatedChanges.map((c) => ({
        path: c.path,
        summary: `Modified ${c.path}`,
      })),
      commit_message,
      summary,
      model_used: 'gpt-4o',
      pr_url: prUrl,
      branch: branchName,
    }

    // 7. Update ticket
    await supabase
      .from('linksy_support_tickets')
      .update({
        remediation_status: 'pr_created',
        remediation_pr_url: prUrl,
        remediation_branch: branchName,
        remediation_result: result,
      })
      .eq('id', ticketId)

    // 8. Notify admin
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
  fileContents: Map<string, string>,
  projectContext: string,
  repoTree: string[],
  unresolvedPaths: string[]
): Promise<{ changes: FileChange[]; commit_message: string; summary: string }> {
  const openai = getOpenAI()

  // Build file context
  const fileContext = Array.from(fileContents.entries())
    .map(([path, content]) => `### File: ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n')

  // Build a compact tree listing (only relevant directories expanded)
  const treeContext = buildCompactTree(repoTree, input.triage.affected_areas)

  // Build context about unresolved paths
  const unresolvedNote = unresolvedPaths.length > 0
    ? `\n\n## WARNING: These triage-suggested paths do NOT exist in the repo\n${unresolvedPaths.map((p) => `- ${p}`).join('\n')}\nDo NOT create files at these paths. Find the correct existing files using the repo tree above.`
    : ''

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: REMEDIATION_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `## Project Documentation (CLAUDE.md)
${projectContext || 'Not available — follow the system prompt conventions.'}

## Repository File Tree
${treeContext}
${unresolvedNote}

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

## Current Source Files (read from the repo)
${fileContext || 'No source files could be read from the affected areas. Use the repo tree to identify the correct files, and explain in your summary which files should be modified.'}

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
- ONLY modify files that exist in the repository tree above
- Return the COMPLETE file content for each changed file (not just diffs)
- Preserve ALL existing code in the file — only change what's needed for the fix
- Use Tailwind classes for styling, shadcn/ui components where appropriate
- Use Next.js App Router patterns (page.tsx, not index.tsx)
- Use Conventional Commits format for the commit message
- Keep changes minimal and focused on the issue
- Ensure TypeScript strict mode compliance
- If you're unsure which file to modify, explain in the summary`,
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

/**
 * Build a compact tree view focused on relevant areas.
 * Shows full expansion for directories mentioned in affected_areas,
 * and collapsed view for other top-level directories.
 */
function buildCompactTree(repoTree: string[], affectedAreas: string[]): string {
  // Get the directory prefixes we care about from affected areas
  const relevantDirs = new Set<string>()
  for (const area of affectedAreas) {
    const parts = area.split('/')
    // Add each parent directory
    for (let i = 1; i <= parts.length; i++) {
      relevantDirs.add(parts.slice(0, i).join('/'))
    }
  }

  // Also always expand key directories
  const alwaysExpand = ['app/dashboard', 'components', 'lib', 'app/api']
  for (const dir of alwaysExpand) {
    relevantDirs.add(dir)
  }

  // Group files by top-level directory
  const grouped = new Map<string, string[]>()
  for (const path of repoTree) {
    const topDir = path.split('/')[0]
    if (!grouped.has(topDir)) grouped.set(topDir, [])
    grouped.get(topDir)!.push(path)
  }

  const lines: string[] = []
  const entries = Array.from(grouped.entries())
  for (const [dir, files] of entries) {
    const isRelevant = relevantDirs.has(dir) || alwaysExpand.some((d) => d.startsWith(dir))

    if (isRelevant) {
      // Show all files in relevant directories
      for (const f of files) {
        lines.push(f)
      }
    } else {
      // Show collapsed summary
      lines.push(`${dir}/ (${files.length} files)`)
    }
  }

  return lines.join('\n')
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
