'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#0891b2', '#dc2626', '#ca8a04', '#6366f1']

interface ChartCardProps {
  title: string
  children: React.ReactNode
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function MonthlyTrendsChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <ChartCard title="Monthly Referral Trends">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function CategoryBreakdownChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartCard title="Referrals by Category">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.slice(0, 10)} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" fontSize={12} />
          <YAxis dataKey="name" type="category" fontSize={11} width={120} />
          <Tooltip />
          <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function StatusPieChart({ data }: { data: { status: string; count: number }[] }) {
  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    customer_need_addressed: 'Addressed',
    wrong_organization_referred: 'Wrong Org',
    outside_of_scope: 'Out of Scope',
    client_not_eligible: 'Not Eligible',
    unable_to_assist: 'Unable to Assist',
    client_unresponsive: 'Unresponsive',
  }

  const chartData = data.map((d) => ({
    name: statusLabels[d.status] || d.status,
    value: d.count,
  }))

  return (
    <ChartCard title="Referrals by Status">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            outerRadius={100}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function TopProvidersChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartCard title="Top Providers by Referrals">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.slice(0, 10)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={11} angle={-45} textAnchor="end" height={80} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function SourceBreakdownChart({ data }: { data: { source: string; count: number }[] }) {
  const chartData = data.map((d) => ({
    name: d.source === 'public_search' ? 'Public Search' : d.source || 'Manual',
    value: d.count,
  }))

  return (
    <ChartCard title="Referrals by Source">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, value }: { name?: string; value?: number }) =>
              `${name ?? ''}: ${value ?? 0}`
            }
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
