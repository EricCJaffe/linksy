'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProviderEvent } from '@/lib/types/linksy'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

/** Parse a simple RRULE string into a human-readable label */
export function formatRecurrence(rule: string | null | undefined): string | null {
  if (!rule) return null
  const upper = rule.toUpperCase()
  if (upper.includes('FREQ=DAILY')) return 'Daily'
  if (upper.includes('FREQ=WEEKLY') && upper.includes('INTERVAL=2')) return 'Bi-weekly'
  if (upper.includes('FREQ=WEEKLY')) return 'Weekly'
  if (upper.includes('FREQ=MONTHLY')) return 'Monthly'
  if (upper.includes('FREQ=YEARLY')) return 'Annually'
  return 'Recurring'
}

interface EventCalendarProps {
  events: ProviderEvent[]
  showProvider?: boolean
}

export function EventCalendar({ events, showProvider = false }: EventCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  const goToPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1)
  const startOffset = firstDayOfMonth.getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Total cells: pad to a multiple of 7
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  // Build a map: "YYYY-MM-DD" -> ProviderEvent[]
  const eventsByDate: Record<string, ProviderEvent[]> = {}
  for (const event of events) {
    const dateKey = event.event_date.slice(0, 10) // "YYYY-MM-DD"
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
    eventsByDate[dateKey].push(event)
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const cells: Array<{ day: number; currentMonth: boolean; dateKey: string }> = []
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - startOffset
    let day: number
    let currentMonth = true
    let dateKey: string

    if (dayOffset < 0) {
      // Previous month
      day = daysInPrevMonth + dayOffset + 1
      currentMonth = false
      const prevMonth = month === 0 ? 12 : month
      const prevYear = month === 0 ? year - 1 : year
      dateKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    } else if (dayOffset >= daysInMonth) {
      // Next month
      day = dayOffset - daysInMonth + 1
      currentMonth = false
      const nextMonth = month === 11 ? 1 : month + 2
      const nextYear = month === 11 ? year + 1 : year
      dateKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    } else {
      day = dayOffset + 1
      dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    cells.push({ day, currentMonth, dateKey })
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-l border-t">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="border-r border-b py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {/* Calendar cells */}
        {cells.map(({ day, currentMonth, dateKey }, idx) => {
          const cellEvents = eventsByDate[dateKey] ?? []
          const isToday = dateKey === todayKey
          return (
            <div
              key={idx}
              className={`border-r border-b min-h-[90px] p-1 ${!currentMonth ? 'bg-muted/30' : ''}`}
            >
              <div
                className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : currentMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {cellEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs rounded px-1 py-0.5 truncate flex items-center gap-1 ${STATUS_COLORS[event.status] ?? 'bg-gray-100 text-gray-800'}`}
                    title={event.title}
                  >
                    {event.recurrence_rule && (
                      <RefreshCw className="h-2.5 w-2.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {showProvider && event.provider?.name
                        ? `${event.provider.name}: ${event.title}`
                        : event.title}
                    </span>
                  </div>
                ))}
                {cellEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{cellEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-200" />
          Pending
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-200" />
          Approved
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200" />
          Rejected
        </div>
        <div className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Recurring
        </div>
      </div>
    </div>
  )
}
