'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CalendarDays, X } from 'lucide-react'

interface DateRangeFilterProps {
  dateFrom: string | undefined
  dateTo: string | undefined
  onDateFromChange: (value: string | undefined) => void
  onDateToChange: (value: string | undefined) => void
  onClear?: () => void
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
}: DateRangeFilterProps) {
  const hasValue = dateFrom || dateTo

  const handleClear = () => {
    onDateFromChange(undefined)
    onDateToChange(undefined)
    onClear?.()
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        type="date"
        value={dateFrom || ''}
        onChange={(e) => onDateFromChange(e.target.value || undefined)}
        className="w-[150px]"
        aria-label="From date"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="date"
        value={dateTo || ''}
        onChange={(e) => onDateToChange(e.target.value || undefined)}
        className="w-[150px]"
        aria-label="To date"
      />
      {hasValue && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 mr-1" />
          Clear dates
        </Button>
      )}
    </div>
  )
}
