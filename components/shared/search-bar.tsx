'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Command } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { SearchResults, type SearchResult } from './search-results'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { logger } from '@/lib/utils/logger'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const debouncedQuery = useDebounce(query, 300)

  // Fetch search results
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null)
      setIsOpen(false)
      return
    }

    setIsLoading(true)

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data)
        setIsOpen(true)
        setSelectedIndex(-1)
      })
      .catch((error) => {
        logger.error('Search error', error instanceof Error ? error : new Error('Unknown error'), {
          query: debouncedQuery
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [debouncedQuery])

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }

      // ESC to close
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const allResults: SearchResult[] = [
    ...(results?.users || []),
    ...(results?.modules || []),
    ...(results?.settings || []),
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !results) return

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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (onSearch) {
        onSearch(query)
      } else if (selectedIndex >= 0 && allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex])
      } else {
        const params = new URLSearchParams()
        if (query) {
          params.set('q', query)
        }
        router.push(`/search?${params.toString()}`)
      }
    },
    [query, onSearch, router, selectedIndex, allResults]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setResults(null)
    setIsOpen(false)
    if (onSearch) {
      onSearch('')
    }
  }, [onSearch])

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    router.push(result.url)
  }

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
