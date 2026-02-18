import * as Sentry from '@sentry/nextjs'

/**
 * Sentry browser-side initialization.
 * Set NEXT_PUBLIC_SENTRY_DSN in your environment to enable.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring in production.
  // Raise this to 1.0 while debugging.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only initialize if a DSN is actually configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Suppress Sentry's own debug output in development
  debug: false,
})
