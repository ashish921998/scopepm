import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createAuth } from './auth'
import { createDb } from './db'
import { userProfile } from './db/schema'
import { eq } from 'drizzle-orm'
import waitlistRoutes from './routes/waitlist'
import interviewRoutes from './routes/interviews'
import specRoutes from './routes/specs'
import onboardingRoutes from './routes/onboarding'
import projectRoutes from './routes/projects'
import devRoutes from './routes/dev'
import { getUserId } from './lib/utils'
import { AppEnv } from './lib/hono'

const app = new Hono<AppEnv>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*'
    if (origin && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return origin
    }
    if (origin && /^https:\/\/([a-z0-9-]+\.)?scopepm(-web)?\.pages\.dev$/.test(origin)) {
      return origin
    }
    console.log('CORS: Unrecognized origin:', origin)
    return origin
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-visitor-id'],
  credentials: true,
}))

// Database middleware - uses Hyperdrive in production, DATABASE_URL locally
app.use('*', async (c, next) => {
  const db = c.env?.HYPERDRIVE ? createDb(c.env.HYPERDRIVE) : createDb()
  c.set('db', db)
  await next()
})

// Session middleware
app.use('*', async (c, next) => {
  const db = c.get('db')
  const isLocal = !c.env?.HYPERDRIVE
  const auth = createAuth(db, {
    secret: c.env?.BETTER_AUTH_SECRET,
    baseURL: isLocal ? 'http://localhost:3001' : c.env?.BETTER_AUTH_URL,
  })
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set('user', null)
    c.set('session', null)
    await next()
    return
  }

  c.set('user', session.user)
  c.set('session', session.session)
  await next()
})

// Mount Better Auth handler
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const db = c.get('db')
  const isLocal = !c.env?.HYPERDRIVE
  const auth = createAuth(db, {
    secret: c.env?.BETTER_AUTH_SECRET,
    baseURL: isLocal ? 'http://localhost:3001' : c.env?.BETTER_AUTH_URL,
  })
  return auth.handler(c.req.raw)
})

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'scopepm-api', environment: c.env?.ENVIRONMENT || 'development' }))

// Routes
app.route('/api/waitlist', waitlistRoutes)
app.route('/api/interviews', interviewRoutes)
app.route('/api/specs', specRoutes)
app.route('/api/onboarding', onboardingRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api/dev', devRoutes)

// Protected route - get current user
app.get('/api/me', async (c) => {
  const user = c.get('user')
  const session = c.get('session')
  const db = c.get('db')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = getUserId(user)
  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))

  return c.json({
    user,
    session,
    profile,
    onboardingCompleted: profile?.onboardingCompleted ?? false,
  })
})

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Named export for testing
export { app }

// Export for Cloudflare Workers - bun also uses this to auto-start a dev server
export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
}
