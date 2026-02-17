'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useDoc } from '@/lib/hooks/useDocs'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import ReactMarkdown from 'react-markdown'

const ROLE_LABELS: Record<string, string> = {
  user: 'All Users',
  provider_employee: 'Provider Staff',
  tenant_admin: 'Admins',
  site_admin: 'Site Admin Only',
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const { data: user } = useCurrentUser()
  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const { data: doc, isLoading, error } = useDoc(params.slug)

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-64 rounded bg-muted animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + (i % 4) * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground opacity-30" />
        <h1 className="text-xl font-semibold">Article not found</h1>
        <p className="text-muted-foreground">
          {error?.message === 'Access denied'
            ? "You don't have permission to view this article."
            : "This article doesn't exist or has been removed."}
        </p>
        <Link
          href="/dashboard/help"
          className="text-sm text-primary underline underline-offset-2"
        >
          Back to Help &amp; Docs
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/help"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Help &amp; Docs
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{doc.category}</Badge>
          {isSiteAdmin && (
            <Badge variant="outline">{ROLE_LABELS[doc.min_role] || doc.min_role}</Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold">{doc.title}</h1>
        {doc.excerpt && (
          <p className="text-lg text-muted-foreground">{doc.excerpt}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Last updated{' '}
          {new Date(doc.updated_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <ReactMarkdown>{doc.content}</ReactMarkdown>
      </div>
    </div>
  )
}
