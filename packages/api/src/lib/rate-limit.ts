import type { Context, MiddlewareHandler } from 'hono'
import type { AppEnv } from './hono'

interface RateLimitConfig {
  windowMs: number
  max: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory fixed-window rate limiter.
// For single-instance deployments (Cloudflare Workers isolates) this is sufficient.
// For multi-instance, migrate state to KV or Durable Objects.
const store = new Map<string, RateLimitEntry>()

function getClientKey(c: Context<AppEnv>): string {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  return ip
}

function cleanExpired() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

// Periodic cleanup to prevent unbounded growth (every 60s)
let lastCleanup = Date.now()

export function rateLimit(config: RateLimitConfig): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    // Skip CORS preflight requests
    if (c.req.method === 'OPTIONS') {
      await next()
      return
    }

    const now = Date.now()
    if (now - lastCleanup > 60_000) {
      cleanExpired()
      lastCleanup = now
    }

    const key = `${getClientKey(c)}:${config.windowMs}:${config.max}`
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + config.windowMs })
      await next()
      return
    }

    if (entry.count >= config.max) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return c.json({ error: 'Too many requests' }, 429)
    }

    entry.count++
    await next()
  }
}

// Preset: strict rate limit for auth endpoints (10 req / 15 min)
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

// Preset: standard rate limit for API endpoints (100 req / min)
export const apiRateLimit = rateLimit({ windowMs: 60 * 1000, max: 100 })
