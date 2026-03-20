'use client'

import { User, Package, Settings, Building2, Palette, Users, Bell, Ticket, Contact } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export interface SearchResult {
  id: string
  type: 'user' | 'module' | 'setting' | 'file' | 'location' | 'ticket' | 'contact' | 'provider'
  title: string
  subtitle: string
  description: string
  url: string
  icon: string
  metadata?: Record<string, any>
}

interface SearchResultsProps {
  results: {
    providers?: SearchResult[]
    users?: SearchResult[]
    modules?: SearchResult[]
    settings?: SearchResult[]
    tickets?: SearchResult[]
    contacts?: SearchResult[]
    [key: string]: SearchResult[] | undefined
  }
  query: string
  onSelect?: (result: SearchResult) => void
  selectedIndex?: number
}

const ICON_MAP = {
  user: User,
  package: Package,
  setting: Settings,
  settings: Settings,
  building: Building2,
  palette: Palette,
  users: Users,
  bell: Bell,
  ticket: Ticket,
  contact: Contact,
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  provider: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  user: 'bg-blue-100 text-blue-800 border-blue-200',
  module: 'bg-purple-100 text-purple-800 border-purple-200',
  setting: 'bg-gray-100 text-gray-800 border-gray-200',
  ticket: 'bg-amber-100 text-amber-800 border-amber-200',
  contact: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

const TYPE_LABELS: Record<string, string> = {
  provider: 'Provider',
  user: 'User',
  module: 'Module',
  setting: 'Setting',
  ticket: 'Referral',
  contact: 'Contact',
}

function highlightMatch(text: string, query: string) {
  if (!query) return text

  const parts = text.split(new RegExp(`(${query})`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={`${i}-${part}`} className="bg-yellow-200 dark:bg-yellow-900">
            {part}
          </mark>
        ) : (
          <span key={`${i}-${part}`}>{part}</span>
        )
      )}
    </>
  )
}

export function SearchResults({
  results,
  query,
  onSelect,
  selectedIndex = -1,
}: SearchResultsProps) {
  const router = useRouter()

  const allResults: SearchResult[] = []
  const groups: { label: string; results: SearchResult[] }[] = []

  if (results.providers && results.providers.length > 0) {
    allResults.push(...results.providers)
    groups.push({ label: 'Providers', results: results.providers })
  }

  if (results.contacts && results.contacts.length > 0) {
    allResults.push(...results.contacts)
    groups.push({ label: 'Contacts', results: results.contacts })
  }

  if (results.tickets && results.tickets.length > 0) {
    allResults.push(...results.tickets)
    groups.push({ label: 'Referrals', results: results.tickets })
  }

  if (results.users && results.users.length > 0) {
    allResults.push(...results.users)
    groups.push({ label: 'Users', results: results.users })
  }

  if (results.modules && results.modules.length > 0) {
    allResults.push(...results.modules)
    groups.push({ label: 'Modules', results: results.modules })
  }

  if (results.settings && results.settings.length > 0) {
    allResults.push(...results.settings)
    groups.push({ label: 'Settings', results: results.settings })
  }

  const handleSelect = (result: SearchResult) => {
    if (onSelect) {
      onSelect(result)
    } else {
      router.push(result.url)
    }
  }

  if (allResults.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No results found for &quot;{query}&quot;
      </div>
    )
  }

  let currentIndex = 0

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {groups.map((group) => (
        <div key={group.label} className="border-b last:border-b-0">
          <div className="bg-muted/50 px-4 py-2">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              {group.label}
            </h3>
          </div>
          <div className="divide-y">
            {group.results.map((result) => {
              const Icon =
                ICON_MAP[result.icon as keyof typeof ICON_MAP] || Settings
              const isSelected = currentIndex === selectedIndex
              const itemIndex = currentIndex++

              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    isSelected && 'bg-muted'
                  )}
                >
                  {result.type === 'user' && result.metadata?.avatar_url ? (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={result.metadata.avatar_url}
                        alt={result.title}
                      />
                      <AvatarFallback>
                        {result.title
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-sm">
                        {highlightMatch(result.title, query)}
                      </p>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', TYPE_BADGE_STYLES[result.type] || '')}>
                        {TYPE_LABELS[result.type] || result.type}
                      </Badge>
                      {result.metadata?.role && (
                        <Badge variant="secondary" className="text-xs">
                          {result.metadata.role}
                        </Badge>
                      )}
                    </div>
                    {result.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {highlightMatch(result.subtitle, query)}
                      </p>
                    )}
                    {result.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {result.description}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
