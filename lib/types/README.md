# TypeScript Types Documentation

This directory contains TypeScript type definitions for the entire application, ensuring end-to-end type safety across the codebase.

## Structure

### Core Types

- **`database.ts`** - Auto-generated Supabase database types
  - Generated from your Supabase database schema
  - Contains all table definitions (Row, Insert, Update)
  - Defines database enums
  - **DO NOT EDIT MANUALLY** - regenerate using the script below

- **`auth.ts`** - Authentication and user types
  - `User` - Extended Supabase user with metadata
  - `UserProfile` - User profile from database
  - `UserRole` - Site-wide user roles (site_admin, tenant_admin, user)
  - `TenantRole` - Tenant-specific roles (admin, member)
  - `AuthSession` - Complete auth session with user, profile, and tenants
  - `TenantMembership` - User's membership in a tenant
  - `Invitation` - Invitation details with optional tenant info

- **`tenant.ts`** - Tenant and organization types
  - `Tenant` - Complete tenant object
  - `TenantSettings` - Tenant configuration options
  - `TenantBranding` - Tenant branding customization
  - `TenantUser` - User membership in a tenant
  - Input types for creating/updating tenants

- **`module.ts`** - Module and permission types
  - `Module` - Modular feature definition
  - `TenantModule` - Module enablement for tenant
  - `ModuleConfig` - Module configuration with routes and permissions
  - `DEFAULT_MODULES` - Pre-configured modules (core, users, notifications, files, audit)

## Generating Database Types

### Prerequisites

1. Install the Supabase CLI (already in devDependencies):
   ```bash
   npm install
   ```

2. Get your Supabase Project ID:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings > General
   - Copy the "Reference ID"

### Generate Types

You have two options:

#### Option 1: Using npm script (recommended)

```bash
# Set your project ID as an environment variable
export SUPABASE_PROJECT_ID=your-project-id

# Generate types
npm run types:generate
```

#### Option 2: Direct command

```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > lib/types/database.ts
```

### When to Regenerate Types

Regenerate your database types whenever you:
- Create, modify, or delete database tables
- Add, change, or remove table columns
- Update column types or constraints
- Modify database enums
- Change Row Level Security (RLS) policies that affect accessible columns

### Type Generation Best Practices

1. **Always regenerate after schema changes** - Keep types in sync with your database
2. **Commit generated types** - Include `database.ts` in version control
3. **Review changes** - Check the git diff after regeneration to understand schema changes
4. **Update helper types** - If you add new tables, create corresponding helper types in `auth.ts`, `tenant.ts`, or `module.ts`

## Using Types in Your Application

### Client-Side (Browser)

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

const supabase = createClient()

// TypeScript knows the exact structure
const { data: tenants } = await supabase
  .from('tenants')
  .select('*')
// data is typed as Database['public']['Tables']['tenants']['Row'][]
```

### Server-Side (Server Components, Route Handlers)

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/types/tenant'

const supabase = createClient()
const { data: tenant } = await supabase
  .from('tenants')
  .select('*')
  .single()

// Use helper types for better ergonomics
const typedTenant: Tenant = {
  ...tenant,
  settings: tenant.settings as TenantSettings,
  branding: tenant.branding as TenantBranding,
}
```

### Form Validation

```typescript
import { z } from 'zod'
import type { Database } from '@/lib/types/database'

// Create schemas based on database types
type TenantInsert = Database['public']['Tables']['tenants']['Insert']

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  // ... other fields matching TenantInsert
})
```

## Type Safety Benefits

✓ **Autocomplete** - IDEs provide intelligent suggestions for table names, columns, and values

✓ **Compile-time errors** - Catch database schema mismatches before runtime

✓ **Refactoring safety** - Rename columns with confidence using IDE refactoring tools

✓ **Documentation** - Types serve as living documentation of your database schema

✓ **Reduced bugs** - Eliminate entire classes of runtime errors related to data structure mismatches

## Troubleshooting

### "Cannot find module '@/lib/types/database'"

Make sure you've generated the types file:
```bash
npm run types:generate
```

### "Property does not exist on type..."

Your database schema may have changed. Regenerate types:
```bash
npm run types:generate
```

### "Authentication failed"

Ensure you have the correct Supabase Project ID and that your Supabase account has access to the project.

## Related Documentation

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/typescript-support)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
