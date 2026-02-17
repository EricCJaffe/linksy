'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import type { ProviderFilters } from '@/lib/types/linksy'

interface ProviderFiltersBarProps {
  filters: ProviderFilters
  onChange: (filters: Partial<ProviderFilters>) => void
}

export function ProviderFiltersBar({ filters, onChange }: ProviderFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search providers..."
        value={filters.q || ''}
        onChange={(e) => onChange({ q: e.target.value, offset: 0 })}
        className="w-64"
      />
      <Select
        value={filters.sector || 'all'}
        onValueChange={(value) => onChange({ sector: value as any, offset: 0 })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sector" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sectors</SelectItem>
          <SelectItem value="nonprofit">Nonprofit</SelectItem>
          <SelectItem value="faith_based">Faith Based</SelectItem>
          <SelectItem value="government">Government</SelectItem>
          <SelectItem value="business">Business</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.status || 'active'}
        onValueChange={(value) => onChange({ status: value as any, offset: 0 })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.referral_type || 'all'}
        onValueChange={(value) => onChange({ referral_type: value as any, offset: 0 })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Referral Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Referral Types</SelectItem>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="contact_directly">Contact Directly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
