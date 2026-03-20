'use client'

import { Input } from '@/components/ui/input'
import { MapPin } from 'lucide-react'

interface ZipCodeFilterProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder?: string
}

export function ZipCodeFilter({
  value,
  onChange,
  placeholder = 'Filter by zip...',
}: ZipCodeFilterProps) {
  return (
    <div className="relative">
      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-[140px] pl-9"
        maxLength={10}
      />
    </div>
  )
}
