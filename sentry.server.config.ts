import * as Sentry from '@sentry/nextjs'

/**
 * Sentry server-side (Node.js) initialization.
 * Set SENTRY_DSN in your environment to enable.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  debug: false,
})
