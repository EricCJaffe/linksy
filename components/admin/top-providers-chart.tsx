'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'

interface TopProvider {
  id: string
  name: string
  count: number
  top_services?: Array<{ name: string; count: number }>
}

const COLORS = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#4f46e5', '#16a34a', '#ea580c', '#be185d',
]

export function TopProvidersChart() {
  const router = useRouter()
  const [providers, setProviders] = useState<TopProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [includeServices, setIncludeServices] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ limit: '10' })
        if (includeServices) params.set('include_services', 'true')
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)

        const res = await fetch(`/api/stats/top-providers?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setProviders(data.providers || [])
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [includeServices, dateFrom, dateTo])

  const truncateName = (name: string, max = 20) =>
    name.length > max ? name.slice(0, max) + '...' : name

  return (
    <Card className="border-primary/20 col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Top Providers by Referral Volume
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setDateFrom(''); setDateTo('') }}
              >
                Clear
              </Button>
            )}
            <div className="flex items-center gap-1.5">
              <Switch
                id="show-services"
                checked={includeServices}
                onCheckedChange={setIncludeServices}
              />
              <Label htmlFor="show-services" className="text-xs">Show Services</Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : providers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No referral data found.</p>
        ) : (
          <div className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={providers}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => truncateName(v)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload as TopProvider
                      return (
                        <div className="rounded-md border bg-popover p-3 shadow-md text-sm">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-muted-foreground">{data.count} referral{data.count !== 1 ? 's' : ''}</p>
                          {data.top_services && data.top_services.length > 0 && (
                            <div className="mt-2 border-t pt-2">
                              <p className="text-xs font-medium mb-1">Top Services:</p>
                              {data.top_services.map((s, i) => (
                                <p key={i} className="text-xs text-muted-foreground">
                                  {s.name} ({s.count})
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data) => {
                      if (data?.id) {
                        router.push(`/dashboard/providers/${data.id}`)
                      }
                    }}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {providers.map((_, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
