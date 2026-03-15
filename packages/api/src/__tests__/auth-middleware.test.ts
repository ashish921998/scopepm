import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/hono'

// ---------------------------------------------------------------------------
// Mock db to prevent any real database connections
// ---------------------------------------------------------------------------
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER vi.mock
// ---------------------------------------------------------------------------
import projectRoutes from '../routes/projects'
import interviewRoutes from '../routes/interviews'
import specRoutes from '../routes/specs'

// ---------------------------------------------------------------------------
// Helper: creates an app with NO authenticated user
// ---------------------------------------------------------------------------
function createUnauthApp() {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', null)
    c.set('session', null)
    await next()
  })
  return app
}

// ---------------------------------------------------------------------------
// Tests: Auth middleware — protected endpoints return 401 without auth
// ---------------------------------------------------------------------------
describe('Auth middleware — protected endpoints return 401 without auth', () => {
  it('GET /api/projects returns 401 without authentication', async () => {
    const app = createUnauthApp()
    app.route('/api/projects', projectRoutes)

    const res = await app.request('/api/projects')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  it('GET /api/interviews returns 401 without authentication', async () => {
    const app = createUnauthApp()
    app.route('/api/interviews', interviewRoutes)

    const res = await app.request('/api/interviews')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  it('GET /api/specs returns 401 without authentication', async () => {
    const app = createUnauthApp()
    app.route('/api/specs', specRoutes)

    const res = await app.request('/api/specs')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  it('GET /api/me returns 401 without authentication', async () => {
    const app = createUnauthApp()
    // Replicate the /api/me route from index.ts
    app.get('/api/me', async (c) => {
      const user = c.get('user')
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401)
      }
      return c.json({ user })
    })

    const res = await app.request('/api/me')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  it('POST /api/projects returns 401 without authentication', async () => {
    const app = createUnauthApp()
    app.route('/api/projects', projectRoutes)

    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project' }),
    })

    expect(res.status).toBe(401)
  })

  it('POST /api/interviews returns 401 without authentication', async () => {
    const app = createUnauthApp()
    app.route('/api/interviews', interviewRoutes)

    const res = await app.request('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', transcript: 'Content', projectId: 1 }),
    })

    expect(res.status).toBe(401)
  })

  it('POST /api/specs returns 401 without authentication', async () => {
    const app = createUnauthApp()
    app.route('/api/specs', specRoutes)

    const res = await app.request('/api/specs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', description: 'A description', projectId: 1 }),
    })

    expect(res.status).toBe(401)
  })
})
