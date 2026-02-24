# Multi-Tenant SaaS Template

A production-ready, enterprise-grade multi-tenant SaaS application template built with Next.js 14, Supabase, and TypeScript. Features comprehensive user management, role-based access control, activity feeds, file uploads, audit logs, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

## ✨ Features

### Multi-Tenancy
- 🏢 **Tenant Isolation** - Complete data isolation between tenants using Row Level Security
- 🎨 **Custom Branding** - Per-tenant logo, colors, and branding
- 👥 **Team Management** - Invite and manage users within each tenant
- 🔐 **Role-Based Access Control** - Site Admin, Tenant Admin, and User roles

### Core Features
- 📊 **Activity Feed** - Personal and company-wide activity timeline
- 📁 **File Management** - Upload, browse, share, and manage files with Supabase Storage
- 🔍 **Global Search** - Search across users, modules, and settings with Cmd+K
- 🔔 **Notifications** - Real-time in-app notifications system
- 📝 **Audit Logs** - Comprehensive logging of all user actions
- 🎯 **Module System** - Enable/disable features per tenant

### Developer Experience
- 🎨 **Modern UI** - Beautiful components with shadcn/ui and Tailwind CSS
- 🔥 **Type Safety** - Full TypeScript coverage
- ⚡ **Fast Development** - Hot reload, ESLint, Prettier
- 🧪 **Error Handling** - Comprehensive error boundaries and user-friendly error pages
- 📱 **Responsive Design** - Mobile-first responsive design
- 🌙 **Dark Mode** - Built-in dark mode support
- 🚀 **Performance** - Optimized loading states, caching, and code splitting

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) |
| **Storage** | [Supabase Storage](https://supabase.com/storage) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **State Management** | [React Query](https://tanstack.com/query/latest) |
| **Form Handling** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Date Handling** | [date-fns](https://date-fns.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Deployment** | [Vercel](https://vercel.com/) |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com/) account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
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

   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Run database migrations** (see [DEPLOYMENT.md](docs/DEPLOYMENT.md))

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System design and data models
- [API Documentation](docs/API.md) - API routes and usage
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Contributing Guide](docs/CONTRIBUTING.md) - How to contribute to this project

## 🏗 Project Structure

```
MultitenantOs/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication pages
│   ├── (dashboard)/             # Dashboard pages
│   │   ├── activity/           # Activity feed
│   │   ├── admin/              # Admin pages
│   │   ├── files/              # File management
│   │   └── settings/           # Settings pages
│   ├── api/                    # API routes
│   ├── error.tsx               # Global error page
│   ├── not-found.tsx           # 404 page
│   └── providers.tsx           # Global providers
├── components/                  # React components
│   ├── activity/               # Activity feed components
│   ├── admin/                  # Admin components
│   ├── auth/                   # Authentication components
│   ├── layout/                 # Layout components
│   ├── settings/               # Settings components
│   ├── shared/                 # Shared components
│   └── ui/                     # shadcn/ui components
├── lib/                        # Utilities and configuration
│   ├── api/                    # API client functions
│   ├── hooks/                  # React hooks
│   ├── storage/                # File storage utilities
│   ├── supabase/               # Supabase client
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utility functions
├── docs/                       # Documentation
├── .github/                    # GitHub Actions workflows
└── supabase/                   # Database migrations

```

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run type check
npx tsc --noEmit

# Format code
npx prettier --write .
```

### Development Workflow

1. Create a new branch for your feature
2. Make your changes
3. Run linter and type check
4. Commit with descriptive message
5. Push and create a pull request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

## 📦 Environment Variables

See `.env.example` for a complete list of environment variables. Key variables include:

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)

### Optional
- `NEXT_PUBLIC_APP_NAME` - Application name (default: "SaaS Template")
- `MULTI_SITE_MODE` - Enable multi-site mode (default: false)
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics
- Feature flags for activity feed, file uploads, notifications, etc.

See [.env.example](.env.example) for detailed descriptions.

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables
4. Deploy

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

### Other Platforms

This template can be deployed to any platform that supports Next.js:
- AWS Amplify
- Netlify
- Railway
- Render
- Self-hosted with Docker

## 🔒 Security

- **Row Level Security (RLS)** - Database-level tenant isolation
- **Authentication** - Secure authentication with Supabase Auth
- **HTTPS** - Enforce HTTPS in production
- **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
- **Input Validation** - Zod schema validation
- **XSS Protection** - React's built-in XSS protection
- **CSRF Protection** - Supabase handles CSRF tokens

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) for details on:

- Code style guidelines
- Commit message format
- Pull request process
- How to add new modules

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Vercel](https://vercel.com/) for hosting and deployment
- [Next.js](https://nextjs.org/) team for the amazing framework

## 📞 Support

- 📧 Email: support@example.com
- 💬 Discord: [Join our community](#)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 Documentation: [docs/](docs/)

## 🗺 Roadmap

- [ ] Multi-language support (i18n)
- [x] Advanced analytics dashboard
- [x] Webhooks system
- [x] Host usage controls & rate limiting (no customer API keys)
- [ ] Billing and subscription management
- [x] Email templates customization
- [ ] Two-factor authentication (2FA)
- [x] OAuth login (Google, Microsoft)
- [ ] SSO integration (SAML)

---

Built with ❤️ using Next.js and Supabase
