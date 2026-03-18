type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
const isProduction = process.env.ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel]
}

function formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  if (isProduction) {
    return JSON.stringify({ level, msg: message, ts: new Date().toISOString(), ...data })
  }
  const prefix = `[${level.toUpperCase()}]`
  const extra = data ? ` ${JSON.stringify(data)}` : ''
  return `${prefix} ${message}${extra}`
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, data))
  },
  info(message: string, data?: Record<string, unknown>) {
    if (shouldLog('info')) console.info(formatMessage('info', message, data))
  },
  warn(message: string, data?: Record<string, unknown>) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, data))
  },
  error(message: string, data?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(formatMessage('error', message, data))
  },
}
