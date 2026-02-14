'use client'

import { Shield, Lock, Key, AlertTriangle, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SecurityTab() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Security & Compliance</h2>
        <p className="text-sm text-muted-foreground">
          Monitor security events and manage platform security
        </p>
      </div>

      {/* Security Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Authentication Security
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              MFA, session management, and password policies
            </p>
            <Button variant="link" className="px-0 mt-2" size="sm" disabled>
              Configure →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              API Access Control
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Enabled</div>
            <p className="text-xs text-muted-foreground">
              Rate limiting, API keys, and access tokens
            </p>
            <Button variant="link" className="px-0 mt-2" size="sm" disabled>
              Manage Keys →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Data Encryption
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Enabled</div>
            <p className="text-xs text-muted-foreground">
              At-rest and in-transit encryption
            </p>
            <Button variant="link" className="px-0 mt-2" size="sm" disabled>
              View Details →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts Placeholder */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardContent className="flex gap-3 pt-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Security Monitoring
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Real-time security alerts and threat detection will appear here. System is currently monitoring for suspicious activity.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription className="mt-1.5">
              Complete activity history and security events
            </CardDescription>
          </div>
          <Link href="/dashboard/admin/audit-logs">
            <Button variant="outline">
              View All Logs →
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium mb-2">Recent Activity</p>
              <p className="text-sm text-muted-foreground">
                Track all system activities including user logins, data changes, and administrative actions.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <div className="flex justify-between p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Total Events</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Last 24 Hours</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Last 7 Days</span>
                <span className="font-medium">--</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Security Features */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access Control</CardTitle>
            <CardDescription>
              Manage roles, permissions, and user access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role-Based Access</span>
                <span className="font-medium">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Permission Groups</span>
                <span className="font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Timeout</span>
                <span className="font-medium">24h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance</CardTitle>
            <CardDescription>
              Security standards and regulations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Retention</span>
                <span className="font-medium">90 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backup Schedule</span>
                <span className="font-medium">Daily</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security Audits</span>
                <span className="font-medium">Monthly</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
