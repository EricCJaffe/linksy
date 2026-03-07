'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Command, Clock, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { SearchResults, type SearchResult } from './search-results'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { logger } from '@/lib/utils/logger'

const RECENT_SEARCHES_KEY = 'linksy-recent-searches'
const MAX_RECENT_SEARCHES = 8

interface RecentSearch {
  query: string
  url?: string
  title?: string
  timestamp: number
}

function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(entry: Omit<RecentSearch, 'timestamp'>) {
  try {
    const existing = getRecentSearches()
    const filtered = existing.filter(
      (s) => s.query.toLowerCase() !== entry.query.toLowerCase()
    )
    const updated = [{ ...entry, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // localStorage unavailable
  }
}

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  defaultValue?: string
  className?: string
  showShortcut?: boolean
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  defaultValue = '',
  className,
  showShortcut = true,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [showRecent, setShowRecent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Fetch search results
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null)
      if (!debouncedQuery) {
        // Show recent searches when input is empty and focused
        setShowRecent(true)
      }
      return
    }

    setShowRecent(false)
    const controller = new AbortController()
    setIsLoading(true)

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data)
        setIsOpen(true)
        setSelectedIndex(-1)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        logger.error('Search error', error instanceof Error ? error : new Error('Unknown error'), {
          query: debouncedQuery
        })
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [debouncedQuery])

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
        if (!query) {
          setRecentSearches(getRecentSearches())
          setShowRecent(true)
        }
      }

      // ESC to close
      if (e.key === 'Escape') {
        setIsOpen(false)
        setShowRecent(false)
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [query])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setShowRecent(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const allResults: SearchResult[] = useMemo(() => [
    ...(results?.users || []),
    ...(results?.modules || []),
    ...(results?.settings || []),
    ...(results?.tickets || []),
    ...(results?.contacts || []),
  ], [results])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && !showRecent) return

    if (showRecent && recentSearches.length > 0 && !results) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < recentSearches.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        const selected = recentSearches[selectedIndex]
        if (selected) {
          if (selected.url) {
            setIsOpen(false)
            setShowRecent(false)
            setQuery('')
            router.push(selected.url)
          } else {
            setQuery(selected.query)
          }
        }
      }
      return
    }

    if (!results) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < allResults.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      const selected = allResults[selectedIndex]
      if (selected) {
        handleSelect(selected)
      }
    }
  }

  const handleSelect = useCallback((result: SearchResult) => {
    saveRecentSearch({ query: query || result.title, url: result.url, title: result.title })
    setRecentSearches(getRecentSearches())
    setIsOpen(false)
    setShowRecent(false)
    setQuery('')
    router.push(result.url)
  }, [router, query])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (onSearch) {
        onSearch(query)
      } else if (selectedIndex >= 0 && allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex])
      } else {
        if (query) {
          saveRecentSearch({ query })
          setRecentSearches(getRecentSearches())
        }
        const params = new URLSearchParams()
        if (query) {
          params.set('q', query)
        }
        router.push(`/search?${params.toString()}`)
      }
    },
    [query, onSearch, router, selectedIndex, allResults, handleSelect]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setResults(null)
    setIsOpen(false)
    setShowRecent(false)
    if (onSearch) {
      onSearch('')
    }
  }, [onSearch])

  const handleClearHistory = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
    setShowRecent(false)
  }, [])

  const handleRecentClick = useCallback((recent: RecentSearch) => {
    if (recent.url) {
      setIsOpen(false)
      setShowRecent(false)
      setQuery('')
      router.push(recent.url)
    } else {
      setQuery(recent.query)
      setShowRecent(false)
    }
  }, [router])

  const showRecentDropdown = showRecent && isOpen && recentSearches.length > 0 && !query

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results && query.length >= 2) {
                setIsOpen(true)
              } else if (!query) {
                setRecentSearches(getRecentSearches())
                setShowRecent(true)
                setIsOpen(true)
              }
            }}
            className="pl-10 pr-24"
            autoComplete="off"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {showShortcut && !query && (
              <kbd className="hidden items-center gap-1 rounded border bg-muted px-2 py-1 text-xs font-medium md:inline-flex">
                <Command className="h-3 w-3" />K
              </kbd>
            )}
          </div>
        </div>
      </form>

      {showRecentDropdown && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-xs font-medium uppercase text-muted-foreground">Recent Searches</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClearHistory}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {recentSearches.map((recent, index) => (
              <button
                key={`${recent.query}-${recent.timestamp}`}
                onClick={() => handleRecentClick(recent)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50',
                  selectedIndex === index && 'bg-muted'
                )}
              >
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{recent.title || recent.query}</p>
                  {recent.title && recent.title !== recent.query && (
                    <p className="truncate text-xs text-muted-foreground">{recent.query}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && results && query.length >= 2 && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-lg border bg-popover shadow-lg">
          <SearchResults
            results={results}
            query={query}
            onSelect={handleSelect}
            selectedIndex={selectedIndex}
          />
        </div>
      )}
    </div>
  )
}
