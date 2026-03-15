import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/hono'

// ---------------------------------------------------------------------------
// Hoisted mock setup — must run before any imports that touch '../db' or '../auth'
// ---------------------------------------------------------------------------
const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../db', () => ({
  createDb: vi.fn().mockReturnValue(mockDb),
  schema: {},
  waitlist: {}, user: {}, session: {}, account: {}, verification: {},
  userProfile: {}, project: {}, interview: {}, featureSpec: {},
}))

vi.mock('../auth', () => ({
  createAuth: vi.fn().mockReturnValue({
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
    handler: vi.fn().mockImplementation(() => new Response('{}', { status: 200 })),
  }),
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER vi.mock
// ---------------------------------------------------------------------------
import projectRoutes from '../routes/projects'
import interviewRoutes from '../routes/interviews'
import specRoutes from '../routes/specs'
import { app as realApp } from '../index'

// ---------------------------------------------------------------------------
// Helper: creates an app with NO authenticated user
// ---------------------------------------------------------------------------
function createUnauthApp() {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', null)
    c.set('session', null)
    c.set('db', mockDb as any)
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
    const res = await realApp.request('/api/me')

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
