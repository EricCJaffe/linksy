# Architecture Guide

This document provides an overview of the system architecture, data models, security approach, and module system design.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Data Model](#data-model)
- [Security Architecture](#security-architecture)
- [Module System](#module-system)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)

## System Overview

This application is built as a **multi-tenant SaaS platform** where multiple organizations (tenants) share the same infrastructure while maintaining complete data isolation.

### Key Characteristics

- **Multi-Tenant**: One codebase serves multiple customers
- **Data Isolation**: Row Level Security (RLS) ensures tenant data separation
- **Scalable**: Designed to handle growth in users and tenants
- **Secure**: Multiple layers of security including RLS, authentication, and authorization
- **Modular**: Features can be enabled/disabled per tenant

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Next.js UI  │  │ React Query  │  │   Supabase   │      │
│  │  Components  │  │    Cache     │  │    Client    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 14 App Router                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages &    │  │  API Routes  │  │  Server      │      │
│  │   Layouts    │  │              │  │  Components  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          Supabase                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth Service│  │   Storage    │      │
│  │  Database    │  │  (JWT)       │  │   (Files)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Row Level   │  │   Realtime   │                        │
│  │  Security    │  │   (WebSocket)│                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Core Tables

#### 1. Users (`users`)
Extends Supabase auth.users with profile information.

```sql
users (
  id uuid PRIMARY KEY,              -- Links to auth.users
  email text UNIQUE NOT NULL,
  role text DEFAULT 'user',         -- 'site_admin' | 'user'
  created_at timestamp
)

profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  full_name text,
  avatar_url text,
  updated_at timestamp
)
```

#### 2. Tenants (`tenants`)
Organizations that use the platform.

```sql
tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,       -- URL-friendly identifier
  logo_url text,
  primary_color text,
  settings jsonb,                   -- Tenant-specific settings
  created_at timestamp,
  updated_at timestamp
)
```

#### 3. Tenant Users (`tenant_users`)
Junction table linking users to tenants with roles.

```sql
tenant_users (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES users(id),
  role text DEFAULT 'member',       -- 'admin' | 'member'
  created_at timestamp,
  UNIQUE(tenant_id, user_id)
)
```

#### 4. Modules (`modules`)
Available features that can be enabled per tenant.

```sql
modules (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamp
)

tenant_modules (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  module_id uuid REFERENCES modules(id),
  is_enabled boolean DEFAULT true,
  settings jsonb,
  UNIQUE(tenant_id, module_id)
)
```

#### 5. Files (`files`)
File metadata for Supabase Storage.

```sql
files (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  module_id text,
  uploaded_by uuid REFERENCES users(id),
  name text NOT NULL,
  size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  is_shared boolean DEFAULT false,
  folder_path text,
  created_at timestamp,
  updated_at timestamp
)
```

#### 6. Audit Logs (`audit_logs`)
Track all important actions in the system.

```sql
audit_logs (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,               -- 'user.created', 'file.uploaded', etc.
  resource_type text NOT NULL,        -- 'user', 'file', 'module', etc.
  resource_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp
)
```

#### 7. Notifications (`notifications`)
In-app notifications for users.

```sql
notifications (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',          -- 'info' | 'success' | 'warning' | 'error'
  read boolean DEFAULT false,
  link text,
  created_at timestamp
)
```

### Data Relationships

```
users ──┬── profiles (1:1)
        │
        ├── tenant_users (1:N)
        │   └── tenants (N:1)
        │       └── tenant_modules (1:N)
        │           └── modules (N:1)
        │
        ├── files (1:N)
        │   └── tenants (N:1)
        │
        ├── audit_logs (1:N)
        │   └── tenants (N:1)
        │
        └── notifications (1:N)
            └── tenants (N:1)
```

## Security Architecture

### 1. Row Level Security (RLS)

Every table with tenant_id has RLS policies to ensure data isolation:

```sql
-- Example: Files table RLS policy
CREATE POLICY "Users can view their tenant's files"
  ON files FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload files to their tenant"
  ON files FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );
```

### 2. Authentication Flow

```
1. User visits /login
2. Enter email/password
3. Supabase Auth validates credentials
4. JWT token issued
5. Token stored in httpOnly cookie
6. Server validates JWT on each request
7. User permissions checked via tenant_users
```

### 3. Authorization Levels

#### Site Admin
- Full system access
- Can view all tenants
- Can create/delete tenants
- Can manage all users

#### Tenant Admin
- Full access to their tenant
- Can invite/remove users
- Can enable/disable modules
- Can view audit logs

#### User (Member)
- Access to their tenant's data
- Limited by module permissions
- Cannot manage users or settings

### 4. API Security

- **Authentication**: JWT validation on all API routes
- **Authorization**: Role and tenant checks
- **Rate Limiting**: Configurable limits per user
- **Input Validation**: Zod schemas on all inputs
- **CSRF Protection**: Handled by Supabase
- **SQL Injection Prevention**: Parameterized queries

## Module System

### Design Philosophy

The module system allows tenants to enable/disable features without code changes.

### Module Structure

```typescript
interface Module {
  id: string
  name: string
  slug: string          // URL-friendly identifier
  description: string
  icon: string
  is_active: boolean    // Globally available
  settings?: object     // Module-specific config
}
```

### Module States

1. **Globally Disabled** - Module exists but not available to any tenant
2. **Available** - Module can be enabled by tenants
3. **Enabled for Tenant** - Tenant has access to the module
4. **Disabled for Tenant** - Tenant cannot access this module

### Adding a New Module

1. **Create Database Entry**
```sql
INSERT INTO modules (name, slug, description, icon, is_active)
VALUES ('Advanced Analytics', 'analytics', 'In-depth analytics dashboard', 'BarChart', true);
```

2. **Create UI Components**
```tsx
// app/(dashboard)/analytics/page.tsx
export default function AnalyticsPage() {
  // Module implementation
}
```

3. **Add Navigation Entry**
```typescript
// lib/navigation/routes.ts
{
  name: 'Analytics',
  href: '/analytics',
  icon: BarChart,
  module: 'analytics'  // Only shows if module enabled
}
```

4. **Enable for Tenant**
```sql
INSERT INTO tenant_modules (tenant_id, module_id, is_enabled)
VALUES ('tenant-uuid', 'module-uuid', true);
```

## Frontend Architecture

### Component Structure

```
components/
├── ui/                  # shadcn/ui base components
├── shared/             # Reusable components
│   ├── error-boundary.tsx
│   ├── loading-skeleton.tsx
│   └── search-bar.tsx
├── layout/             # Layout components
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── mobile-nav.tsx
└── [feature]/          # Feature-specific components
    ├── component.tsx
    └── component.test.tsx
```

### State Management

- **Server State**: React Query for API data
  - Automatic caching
  - Background refetching
  - Optimistic updates

- **Client State**: React hooks (useState, useContext)
  - Form state
  - UI state (modals, dropdowns)

- **Global State**: React Context (minimal usage)
  - User session
  - Tenant information

### Data Fetching Pattern

```typescript
// Custom hook with React Query
export function useActivityFeed(scope: 'personal' | 'company') {
  return useQuery({
    queryKey: ['activities', scope],
    queryFn: () => fetchActivities(scope),
    staleTime: 60 * 1000,  // 1 minute
  })
}

// Component usage
function ActivityFeed() {
  const { data, isLoading, error } = useActivityFeed('company')

  if (isLoading) return <LoadingSkeleton type="timeline" />
  if (error) return <ErrorMessage error={error} />

  return <ActivityTimeline activities={data} />
}
```

## Backend Architecture

### API Routes

```
app/api/
├── activity/           # Activity feed
│   └── route.ts
├── audit-logs/         # Audit logging
│   └── route.ts
├── files/              # File management
│   ├── upload/
│   ├── [id]/
│   └── route.ts
└── search/             # Global search
    └── route.ts
```

### API Route Pattern

```typescript
export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    // 3. Authorize action
    if (!canPerformAction(tenantUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Fetch data (RLS ensures tenant isolation)
    const { data } = await supabase
      .from('table_name')
      .select('*')

    // 5. Return response
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
```

### Error Handling

- **Client Errors (4xx)**: User-friendly messages
- **Server Errors (5xx)**: Logged to console (and Sentry in production)
- **Database Errors**: Translated to user-friendly messages
- **Validation Errors**: Zod error formatting

## Performance Optimizations

### Frontend
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component
- **Caching**: React Query with stale-while-revalidate
- **Lazy Loading**: Dynamic imports for heavy components
- **Debouncing**: Search inputs and API calls

### Backend
- **Database Indexes**: On frequently queried columns
- **Query Optimization**: Select only needed columns
- **Connection Pooling**: Supabase handles this
- **Caching**: React Query on client, Supabase caching on server

### Monitoring
- **Error Tracking**: Sentry (optional)
- **Analytics**: Google Analytics or PostHog (optional)
- **Performance**: Web Vitals tracking
- **Database**: Supabase dashboard metrics

## Scalability Considerations

### Horizontal Scaling
- Next.js automatically scales with Vercel
- Supabase handles database scaling
- Serverless architecture for API routes

### Vertical Scaling
- Database can be upgraded in Supabase dashboard
- File storage is unlimited with Supabase
- No server to manage

### Future Improvements
- Implement caching layer (Redis)
- Add CDN for static assets
- Consider database read replicas for analytics
- Implement background job processing

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
