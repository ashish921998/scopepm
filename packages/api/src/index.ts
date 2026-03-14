import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './auth'
import { db } from './db'
import { userProfile } from './db/schema'
import { eq } from 'drizzle-orm'
import waitlistRoutes from './routes/waitlist'
import interviewRoutes from './routes/interviews'
import specRoutes from './routes/specs'
import onboardingRoutes from './routes/onboarding'
import projectRoutes from './routes/projects'
import { getUserId } from './lib/utils'
import { AppEnv } from './lib/hono'

const app = new Hono<AppEnv>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: (origin) => {
    // Allow all localhost ports in development
    if (origin && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return origin
    }
    // Allow production domains
    if (origin && /^https:\/\/[a-z0-9-]+\.scopepm-web\.pages\.dev$/.test(origin)) {
      return origin
    }
    return 'http://localhost:5173'
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Session middleware - attach user/session to context
app.use('*', async (c, next) => {
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
  return auth.handler(c.req.raw)
})

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'scopepm-api', environment: c.env.ENVIRONMENT || 'development' }))

// Routes
app.route('/api/waitlist', waitlistRoutes)
app.route('/api/interviews', interviewRoutes)
app.route('/api/specs', specRoutes)
app.route('/api/onboarding', onboardingRoutes)
app.route('/api/projects', projectRoutes)

// Protected route - get current user
app.get('/api/me', async (c) => {
  const user = c.get('user')
  const session = c.get('session')

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

// Export for Cloudflare Workers - bun also uses this to auto-start a dev server
export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
}
