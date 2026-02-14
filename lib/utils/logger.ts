/**
 * Centralized Logging Utility
 * Provides structured logging with different severity levels
 * Can be easily integrated with external services (Sentry, CloudWatch, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogContext {
  [key: string]: any
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  environment: string
  error?: Error
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  /**
   * Format log entry for output
   */
  private formatEntry(entry: LogEntry): string {
    const { level, message, context, timestamp } = entry
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  /**
   * Send log to external service (implement when ready)
   * TODO: Integrate with Sentry, CloudWatch, or other logging service
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Placeholder for external logging service integration
    // Example: await Sentry.captureException(entry.error, { level: entry.level, extra: entry.context })

    // For now, this is a no-op in production (logs go to stdout/stderr)
    // When ready to integrate Sentry:
    // 1. npm install @sentry/nextjs
    // 2. Initialize Sentry in this file
    // 3. Uncomment the Sentry calls below

    /*
    if (entry.level === 'error' || entry.level === 'fatal') {
      if (entry.error) {
        Sentry.captureException(entry.error, {
          level: entry.level,
          extra: entry.context,
        })
      } else {
        Sentry.captureMessage(entry.message, {
          level: entry.level,
          extra: entry.context,
        })
      }
    }
    */
  }

  /**
   * Core logging method
   */
  private async log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): Promise<void> {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      error,
    }

    // In development, use console with colors
    if (this.isDevelopment) {
      const formattedMessage = this.formatEntry(entry)

      switch (level) {
        case 'debug':
          console.debug(formattedMessage)
          break
        case 'info':
          console.info(formattedMessage)
          break
        case 'warn':
          console.warn(formattedMessage)
          break
        case 'error':
        case 'fatal':
          console.error(formattedMessage)
          if (error) {
            console.error(error)
          }
          break
      }
    } else {
      // In production, output as JSON for log aggregation
      console.log(JSON.stringify(entry))

      // Send to external service
      await this.sendToExternalService(entry)
    }
  }

  /**
   * Debug level - detailed information for debugging
   * Only logged in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  /**
   * Info level - general informational messages
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  /**
   * Warning level - potentially harmful situations
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  /**
   * Error level - error events that might still allow the app to continue
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error)
  }

  /**
   * Fatal level - severe errors that will cause the app to abort
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log('fatal', message, context, error)
  }

  /**
   * API error logging helper
   * Logs API errors with request context
   */
  apiError(
    endpoint: string,
    method: string,
    error: Error,
    context?: LogContext
  ): void {
    this.error(`API Error: ${method} ${endpoint}`, error, {
      endpoint,
      method,
      ...context,
    })
  }

  /**
   * Database error logging helper
   */
  dbError(operation: string, error: Error, context?: LogContext): void {
    this.error(`Database Error: ${operation}`, error, {
      operation,
      ...context,
    })
  }

  /**
   * Authentication error logging helper
   */
  authError(message: string, context?: LogContext): void {
    this.warn(`Auth Error: ${message}`, context)
  }

  /**
   * Security event logging helper
   */
  securityEvent(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      securityEvent: true,
      ...context,
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing or custom instances
export { Logger }
