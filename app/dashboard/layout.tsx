import { DashboardShell } from '@/components/layout/dashboard-shell'

// Force dynamic rendering — dashboard pages require auth and DB access
// and must not be statically prerendered at build time.
export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
