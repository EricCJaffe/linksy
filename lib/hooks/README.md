# React Hooks for State Management

This directory contains custom React hooks for managing global application state using **React Query** instead of the traditional Context API.

## Why React Query Instead of Context?

React Query is used for state management in this application because it provides:

1. **Automatic caching** - Data is cached and reused across components
2. **Background refetching** - Keeps data fresh automatically
3. **Loading and error states** - Built-in state management
4. **Request deduplication** - Multiple components can request the same data without duplicate API calls
5. **Optimistic updates** - Better UX with instant UI updates
6. **Stale-while-revalidate** - Shows cached data while fetching fresh data

This is superior to Context API for server state management, which is what most of our application state is.

## Available Hooks

### User Management

#### `useCurrentUser()`
Returns the currently authenticated user with their profile data.

```typescript
const { data: user, isLoading, error } = useCurrentUser()

// Access user data
const userEmail = user?.email
const userName = user?.profile?.full_name
const userRole = user?.profile?.role // 'site_admin' | 'tenant_admin' | 'user'
```

**Returns:**
- `data` - User object with profile
- `isLoading` - Loading state
- `error` - Error object if fetch failed

#### `useUpdateProfile()`
Mutation hook for updating the current user's profile.

```typescript
const { mutate: updateProfile, isPending } = useUpdateProfile()

updateProfile(
  { full_name: 'John Doe', avatar_url: 'https://...' },
  {
    onSuccess: () => console.log('Profile updated!'),
    onError: (error) => console.error(error),
  }
)
```

#### `useSignOut()`
Mutation hook for signing out the current user.

```typescript
const { mutate: signOut, isPending } = useSignOut()

signOut(undefined, {
  onSuccess: () => router.push('/login'),
})
```

### Tenant Management

#### `useCurrentTenant()`
Returns the current active tenant and all tenant memberships for the user.

```typescript
const { data: tenantData, isLoading } = useCurrentTenant()

// Access tenant data
const currentTenant = tenantData?.tenant
const tenantName = currentTenant?.name
const tenantSlug = currentTenant?.slug
const userRole = tenantData?.role // 'admin' | 'member'
const allTenants = tenantData?.memberships
```

**Returns:**
- `data.tenant` - Current active tenant
- `data.role` - User's role in current tenant
- `data.memberships` - All tenant memberships
- `isLoading` - Loading state

**Note:** The current tenant is stored in localStorage and persists across sessions.

#### `useTenantSwitcher()`
Provides functions for switching between tenants.

```typescript
const { switchTenant, getCurrentTenantId } = useTenantSwitcher()

// Switch to a different tenant
switchTenant('tenant-id-123')

// Get current tenant ID
const currentId = getCurrentTenantId()
```

**What happens on switch:**
1. Updates localStorage with new tenant ID
2. Invalidates all tenant-related queries
3. Redirects to dashboard
4. Fresh data is fetched for the new tenant

#### `useTenantUsers(tenantId)`
Returns all users in a specific tenant.

```typescript
const { data: users, isLoading } = useTenantUsers(tenantId)

// Access user list
users?.forEach(user => {
  console.log(user.user?.full_name, user.role)
})
```

#### `useUpdateTenant()`
Mutation hook for updating tenant settings.

```typescript
const { mutate: updateTenant } = useUpdateTenant()

updateTenant(
  { id: 'tenant-123', name: 'New Name', settings: {...} },
  {
    onSuccess: () => console.log('Tenant updated!'),
  }
)
```

### Permissions

#### `usePermissions()`
Comprehensive hook for checking user permissions and roles.

```typescript
const {
  // Permission checking functions
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  canAccessModule,
  isModuleAdmin,

  // Role information
  userRole,      // 'site_admin' | 'tenant_admin' | 'user'
  tenantRole,    // 'admin' | 'member'
  isSiteAdmin,   // boolean
  isTenantAdmin, // boolean
  isAdmin,       // boolean (site or tenant admin)
  isMember,      // boolean

  // All permissions
  permissions,   // Array of Permission strings

  // Loading state
  isLoading,
} = usePermissions()

// Check specific permission
if (hasPermission('users:write')) {
  // User can edit users
}

// Check multiple permissions (OR)
if (hasAnyPermission(['users:write', 'users:delete'])) {
  // User can edit OR delete users
}

// Check multiple permissions (AND)
if (hasAllPermissions(['users:read', 'users:write'])) {
  // User can read AND write users
}

// Check role
if (hasRole('admin')) {
  // User is an admin
}

// Check module access
if (canAccessModule('files')) {
  // User can access files module
}

// Check module admin
if (isModuleAdmin('users')) {
  // User is admin for users module
}
```

**Available Permissions:**
- `tenants:read`, `tenants:write`, `tenants:delete`
- `users:read`, `users:write`, `users:invite`, `users:delete`
- `modules:read`, `modules:write`
- `settings:read`, `settings:write`
- `branding:read`, `branding:write`
- `files:read`, `files:write`, `files:delete`
- `audit:read`
- `notifications:read`, `notifications:write`

**Permission Levels:**
- **Site Admin**: All permissions
- **Tenant Admin**: All tenant-level permissions (no global tenant management)
- **Member**: Read-only access to most features

### Module Management

#### `useModules()`
Returns all enabled modules for the current tenant.

```typescript
const { data: modules, isLoading } = useModules()

// Check if specific module is enabled
const filesEnabled = modules?.some(m => m.slug === 'files' && m.is_enabled)
```

### Notifications

#### `useNotifications()`
Returns all notifications for the current user.

```typescript
const { data: notifications, isLoading } = useNotifications()

// Access notifications
const unreadCount = notifications?.filter(n => !n.read_at).length
```

#### `useMarkNotificationRead()`
Mutation hook for marking a notification as read.

```typescript
const { mutate: markAsRead } = useMarkNotificationRead()

markAsRead(notificationId)
```

## Best Practices

### 1. Always Handle Loading States

```typescript
const { data, isLoading, error } = useCurrentUser()

if (isLoading) return <LoadingSpinner />
if (error) return <ErrorMessage error={error} />
if (!data) return null

return <UserProfile user={data} />
```

### 2. Use Mutations for Updates

```typescript
// ❌ Don't mutate data directly
const { data: user } = useCurrentUser()
user.profile.name = 'New Name' // This won't work!

// ✅ Use mutation hooks
const { mutate: updateProfile } = useUpdateProfile()
updateProfile({ full_name: 'New Name' })
```

### 3. Combine Hooks for Complex Logic

```typescript
function UserSettings() {
  const { data: user } = useCurrentUser()
  const { data: tenant } = useCurrentTenant()
  const { hasPermission } = usePermissions()

  if (!hasPermission('settings:write')) {
    return <AccessDenied />
  }

  return <SettingsForm user={user} tenant={tenant} />
}
```

### 4. Leverage Automatic Refetching

React Query automatically refetches data when:
- Window regains focus
- Network reconnects
- Component mounts (if data is stale)

You don't need to manually refetch in most cases.

### 5. Optimistic Updates

For better UX, use optimistic updates:

```typescript
const { mutate: updateProfile } = useUpdateProfile()

updateProfile(newData, {
  // Optimistically update UI before API call completes
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['currentUser'] })
    const previousData = queryClient.getQueryData(['currentUser'])
    queryClient.setQueryData(['currentUser'], (old) => ({
      ...old,
      profile: { ...old.profile, ...newData }
    }))
    return { previousData }
  },
  // Rollback on error
  onError: (err, newData, context) => {
    queryClient.setQueryData(['currentUser'], context.previousData)
  },
})
```

## Query Keys

Understanding query keys helps with debugging and manual cache operations:

- `['currentUser']` - Current authenticated user
- `['currentTenant']` - Current active tenant
- `['tenantUsers', tenantId]` - Users in a specific tenant
- `['tenantModules', tenantId]` - Enabled modules for a tenant
- `['notifications']` - User notifications

## React Query DevTools

In development, React Query DevTools are available to inspect:
- Active queries and their states
- Query data and cache
- Mutations and their status
- Background refetches

Open your browser console and look for the React Query icon.

## Migration from Context API

If you're familiar with Context API, here's how to think about React Query:

| Context API | React Query |
|-------------|-------------|
| `createContext()` | `useQuery()` |
| `useContext()` | `useQuery()` |
| `useState()` + Context | `useMutation()` |
| Manual refetch | Automatic |
| Manual loading states | Built-in `isLoading` |
| Manual error handling | Built-in `error` |
| No caching | Automatic caching |

## Related Files

- `/lib/utils/permissions.ts` - Permission utility functions
- `/lib/types/auth.ts` - User and auth type definitions
- `/lib/types/tenant.ts` - Tenant type definitions
- `/app/providers.tsx` - React Query provider setup
