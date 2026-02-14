'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Activity, TrendingUp, Database, Zap } from 'lucide-react'

export function StatisticsTab() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Platform Statistics</h2>
        <p className="text-sm text-muted-foreground">
          Overview of platform usage and performance metrics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tenants
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Active organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Across all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              API Requests
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
          <CardDescription>
            Platform activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="flex flex-col items-center gap-2 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Analytics Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Usage trends and charts will be displayed here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Growth</CardTitle>
            <CardDescription>
              New organizations over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <div className="flex flex-col items-center gap-2 text-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Tenant growth chart
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>
              New user registrations over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  User growth chart
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage & Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>
            Storage and system resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Database Size</span>
            </div>
            <span className="text-sm font-medium">-- MB</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">File Storage</span>
            </div>
            <span className="text-sm font-medium">-- GB</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">API Rate Limit</span>
            </div>
            <span className="text-sm font-medium">-- / hour</span>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
