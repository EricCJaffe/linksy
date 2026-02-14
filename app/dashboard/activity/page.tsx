'use client'

import { useState } from 'react'
import { Activity as ActivityIcon, Users, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import type { ActivityScope } from '@/lib/hooks/useActivityFeed'

const ACTION_TYPES = [
  { value: '', label: 'All Activities' },
  { value: 'user.created', label: 'User Joined' },
  { value: 'user.invited', label: 'User Invited' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deleted', label: 'User Removed' },
  { value: 'module.enabled', label: 'Module Enabled' },
  { value: 'module.disabled', label: 'Module Disabled' },
  { value: 'role.changed', label: 'Role Changed' },
  { value: 'file.uploaded', label: 'File Uploaded' },
  { value: 'file.deleted', label: 'File Deleted' },
  { value: 'file.shared', label: 'File Shared' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
]

export default function ActivityPage() {
  const [scope, setScope] = useState<ActivityScope>('company')
  const [actionType, setActionType] = useState<string>('')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground">
            Stay updated with recent activities in your workspace
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter activities by type to find what you're looking for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by activity type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline with Tabs */}
      <Tabs value={scope} onValueChange={(v) => setScope(v as ActivityScope)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="company">
            <Users className="mr-2 h-4 w-4" />
            Company-wide
          </TabsTrigger>
          <TabsTrigger value="personal">
            <User className="mr-2 h-4 w-4" />
            Personal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Activity</CardTitle>
              <CardDescription>
                See what's happening across your entire workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                scope="company"
                actionType={actionType || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Activity</CardTitle>
              <CardDescription>
                View your recent actions and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                scope="personal"
                actionType={actionType || undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
