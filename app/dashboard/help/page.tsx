'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Search, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useDocs } from '@/lib/hooks/useDocs'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  user: { label: 'All Users', variant: 'secondary' },
  provider_employee: { label: 'Provider Staff', variant: 'outline' },
  tenant_admin: { label: 'Admins', variant: 'default' },
  site_admin: { label: 'Site Admin', variant: 'destructive' },
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function HelpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: user } = useCurrentUser()
  const isSiteAdmin = user?.profile?.role === 'site_admin'

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const debouncedQ = useDebounce(searchInput, 300)

  const { data, isLoading } = useDocs({ q: debouncedQ || undefined })
  const docs = data?.docs || []

  // Derive category list from all docs (unfiltered by category)
  const categories = useMemo(() => {
    const cats = new Set(docs.map((d) => d.category))
    return ['All', ...Array.from(cats).sort()]
  }, [docs])

  const filteredDocs = useMemo(() => {
    if (activeCategory === 'All') return docs
    return docs.filter((d) => d.category === activeCategory)
  }, [docs, activeCategory])

  // Sync search to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedQ) {
      params.set('q', debouncedQ)
    } else {
      params.delete('q')
    }
    router.replace(`/dashboard/help?${params}`, { scroll: false })
  }, [debouncedQ, router, searchParams])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Help &amp; Documentation
          </h1>
          <p className="text-muted-foreground mt-1">
            Guides and reference articles for using Linksy.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search docs..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category chips */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Doc cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-lg font-medium">No articles found</p>
          {debouncedQ && (
            <p className="text-sm">
              Try a different search term, or{' '}
              <button
                className="underline"
                onClick={() => setSearchInput('')}
              >
                clear the search
              </button>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => {
            const roleInfo = ROLE_LABELS[doc.min_role]
            return (
              <Link key={doc.id} href={`/dashboard/help/${doc.slug}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {doc.category}
                      </Badge>
                      {isSiteAdmin && roleInfo && (
                        <Badge variant={roleInfo.variant} className="text-xs shrink-0">
                          {roleInfo.label}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors flex items-center gap-1">
                      {doc.title}
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                    {doc.excerpt && (
                      <CardDescription className="line-clamp-2 text-sm">
                        {doc.excerpt}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
