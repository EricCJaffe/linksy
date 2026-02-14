# Contributing Guide

Thank you for your interest in contributing to the Multi-Tenant SaaS Template! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Adding New Modules](#adding-new-modules)
- [Commit Message Format](#commit-message-format)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A Supabase account for local development
- Familiarity with Next.js, React, and TypeScript

### Local Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/MultitenantOs.git
   cd MultitenantOs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. **Create a branch** - Always work on a feature branch
2. **Make changes** - Implement your feature or fix
3. **Test locally** - Ensure everything works
4. **Lint and type-check** - Run `npm run lint` and `npx tsc --noEmit`
5. **Commit** - Follow our commit message format
6. **Push** - Push your branch to your fork
7. **Create PR** - Open a pull request with a clear description

### Branch Naming

Use descriptive branch names:
- `feature/add-billing-system`
- `fix/auth-redirect-loop`
- `docs/update-api-documentation`
- `refactor/improve-error-handling`

## Code Style Guide

### TypeScript

- **Use TypeScript for all files** - No `.js` or `.jsx` files
- **Define interfaces** - Always define types for props and data
- **Avoid `any`** - Use proper types or `unknown`
- **Use const assertions** - For readonly data

```typescript
// Good
interface UserProps {
  user: {
    id: string
    name: string
    email: string
  }
  onUpdate: (id: string) => void
}

// Bad
interface UserProps {
  user: any
  onUpdate: Function
}
```

### React Components

#### Functional Components

Always use functional components with hooks:

```typescript
// Good
export function UserCard({ user }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <Card>
      {/* Component content */}
    </Card>
  )
}

// Bad
export default class UserCard extends React.Component {
  // Class components
}
```

#### Component Structure

```typescript
'use client' // Only for client components

import { useState } from 'react'
import { Card } from '@/components/ui/card'

interface ComponentProps {
  // Props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState()

  // Event handlers
  const handleClick = () => {
    // Handler logic
  }

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### File Naming

- **Components**: PascalCase - `UserCard.tsx`
- **Utilities**: camelCase - `formatDate.ts`
- **Hooks**: camelCase with use prefix - `useCurrentUser.ts`
- **API Routes**: lowercase with dash - `audit-logs/route.ts`

### Imports

Order imports by category:

```typescript
// 1. React and Next.js
import { useState } from 'react'
import Link from 'next/link'

// 2. External libraries
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

// 3. Internal components
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 4. Utilities and types
import { cn } from '@/lib/utils/cn'
import type { User } from '@/lib/types'
```

### CSS and Styling

- **Use Tailwind CSS** - Utility-first approach
- **Use cn() utility** - For conditional classes
- **Avoid inline styles** - Unless absolutely necessary
- **Follow mobile-first** - Start with mobile, add responsive breakpoints

```typescript
// Good
<div className={cn(
  'rounded-lg border p-4',
  isActive && 'bg-primary text-white',
  className
)}>

// Bad
<div style={{ padding: '16px', borderRadius: '8px' }}>
```

## Adding New Modules

Follow these steps to add a new module to the system:

### 1. Database Setup

Create a database migration:

```sql
-- Add module to modules table
INSERT INTO modules (name, slug, description, icon, is_active)
VALUES (
  'Billing',
  'billing',
  'Manage subscriptions and invoices',
  'CreditCard',
  true
);
```

### 2. Create Page

```typescript
// app/(dashboard)/billing/page.tsx
'use client'

import { Card } from '@/components/ui/card'

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Billing</h1>
      {/* Page content */}
    </div>
  )
}
```

### 3. Create Loading State

```typescript
// app/(dashboard)/billing/loading.tsx
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'

export default function BillingLoading() {
  return <LoadingSkeleton type="card" count={3} />
}
```

### 4. Add Navigation Entry

Update the navigation configuration to include the new module:

```typescript
// lib/navigation.ts
{
  name: 'Billing',
  href: '/billing',
  icon: CreditCard,
  module: 'billing'  // Links to module slug
}
```

### 5. Create Components

```
components/
└── billing/
    ├── subscription-card.tsx
    ├── invoice-list.tsx
    └── payment-method.tsx
```

### 6. Add API Routes

```typescript
// app/api/billing/route.ts
export async function GET(request: Request) {
  // API implementation
}
```

### 7. Document the Module

Update relevant documentation:
- API endpoints in `docs/API.md`
- Module description in `README.md`
- Architecture updates in `docs/ARCHITECTURE.md`

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no code change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```
feat(auth): add two-factor authentication

Implemented TOTP-based 2FA for enhanced security.
Users can enable 2FA in their account settings.

Closes #123
```

```
fix(files): resolve file upload error for large files

Increased the upload size limit and improved
error handling for timeout scenarios.

Fixes #456
```

```
docs(api): update API documentation for search endpoint

Added request/response examples and error codes
for the global search API route.
```

### Commit Message Rules

- Use the imperative, present tense: "add" not "added" nor "adds"
- Don't capitalize the first letter
- No period (.) at the end of the subject line
- Separate subject from body with a blank line
- Limit subject line to 50 characters
- Wrap body at 72 characters
- Use body to explain what and why, not how

## Testing Requirements

### Current State

This template doesn't include tests out of the box, but contributions that add testing infrastructure are welcome!

### Future Testing Goals

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright
- **API Tests**: Supertest
- **Coverage**: Minimum 80% for new features

### Manual Testing Checklist

Before submitting a PR, manually test:

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Responsive on mobile, tablet, desktop
- [ ] Works in both light and dark mode
- [ ] Error states handled gracefully
- [ ] Loading states displayed correctly
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings

## Pull Request Process

### Before Creating a PR

1. **Fetch latest changes**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run linter**
   ```bash
   npm run lint
   ```

3. **Check types**
   ```bash
   npx tsc --noEmit
   ```

4. **Test locally**
   - Test your changes thoroughly
   - Check different screen sizes
   - Test error scenarios

### Creating a PR

1. **Use a descriptive title**
   - Good: "feat(billing): add subscription management"
   - Bad: "Update files"

2. **Fill out the PR template**
   - Description of changes
   - Related issues
   - Screenshots (if UI changes)
   - Testing performed

3. **Add labels**
   - `feature`, `bugfix`, `documentation`, etc.

4. **Request review**
   - Tag relevant reviewers
   - Link related issues

### PR Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Screenshots
(If applicable)

## Testing Performed
- [ ] Tested locally
- [ ] Tested on mobile
- [ ] Tested error cases
- [ ] TypeScript compiles
- [ ] ESLint passes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Code Review Guidelines

### As a Reviewer

- **Be respectful and constructive**
- **Focus on the code, not the person**
- **Explain the "why" behind suggestions**
- **Approve if changes are acceptable** - Don't block for minor issues
- **Use GitHub suggestions** - For small changes

### Common Review Points

- Does it follow our code style?
- Is it well-documented?
- Are edge cases handled?
- Is error handling comprehensive?
- Does it maintain backwards compatibility?
- Are there any security concerns?
- Is it performant?

### As an Author

- **Don't take it personally** - Reviews help improve code quality
- **Respond to all comments** - Even if just to acknowledge
- **Ask questions** - If feedback is unclear
- **Make requested changes** - Or explain why not
- **Mark conversations as resolved** - When addressed

## Questions or Issues?

- **Discord**: [Join our community](#)
- **Email**: support@example.com
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
