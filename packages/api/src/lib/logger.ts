type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

type LoggerConfig = {
  isProduction?: boolean
  minLevel?: LogLevel
}

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEVEL_ORDER, value)
}

function resolveLogLevel(value: unknown): LogLevel {
  return isLogLevel(value) ? value : 'info'
}

const config: Required<LoggerConfig> = {
  // Default to structured JSON unless runtime env config explicitly says otherwise.
  isProduction: true,
  minLevel: resolveLogLevel(process.env.LOG_LEVEL),
}

export function configureLogger(nextConfig: LoggerConfig): void {
  if (typeof nextConfig.isProduction === 'boolean') {
    config.isProduction = nextConfig.isProduction
  }
  if (isLogLevel(nextConfig.minLevel)) {
    config.minLevel = nextConfig.minLevel
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[config.minLevel]
}

function safeStringify(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload)
  } catch {
    return JSON.stringify({
      level: payload.level,
      msg: payload.msg,
      ts: payload.ts,
      unserializable_data: true,
    })
  }
}

function formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const { level: _, msg: __, ts: ___, ...safeData } = data ?? {}

  const payload = { level, msg: message, ts: new Date().toISOString(), ...safeData }

  if (config.isProduction) {
    return safeStringify(payload)
  }

  const prefix = `[${level.toUpperCase()}]`
  const extra = safeData ? ` ${safeStringify(safeData)}` : ''
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
