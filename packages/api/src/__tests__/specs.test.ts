import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/hono'

// ---------------------------------------------------------------------------
// Hoisted mock setup — must run before any imports that touch '../db'
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const mockReturning = vi.fn()
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockReturning })
  const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

  const mockWhere = vi.fn()
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  return { mockReturning, mockUpdateWhere, mockSet, mockUpdate, mockWhere, mockFrom, mockSelect }
})

vi.mock('../db', () => ({
  db: {
    select: mocks.mockSelect,
    update: mocks.mockUpdate,
  },
}))

// ---------------------------------------------------------------------------
// Import route AFTER vi.mock so the mock is in place
// ---------------------------------------------------------------------------
import specRoutes from '../routes/specs'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_USER_ID = 1
const MOCK_SPEC_ID = 42

const mockSpec = {
  id: MOCK_SPEC_ID,
  userId: MOCK_USER_ID,
  projectId: 1,
  interviewId: null,
  title: 'Original Title',
  description: 'Original description',
  acceptanceCriteria: null,
  priority: 'medium',
  status: 'draft',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

// ---------------------------------------------------------------------------
// Test app factory — injects mock user so auth check passes
// ---------------------------------------------------------------------------
function createTestApp(userId = MOCK_USER_ID) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', { id: String(userId), email: 'test@example.com', name: 'Test User' } as any)
    c.set('session', {} as any)
    await next()
  })
  app.route('/', specRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PUT /api/specs/:id — field whitelist security', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: select returns the mock spec (ownership passes)
    mocks.mockWhere.mockResolvedValue([mockSpec])

    // Default: update returns updated spec
    mocks.mockReturning.mockResolvedValue([{ ...mockSpec, updatedAt: new Date() }])
    mocks.mockUpdateWhere.mockReturnValue({ returning: mocks.mockReturning })
    mocks.mockSet.mockReturnValue({ where: mocks.mockUpdateWhere })
    mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet })
  })

  it('does not spread protected fields (userId, id, createdAt) into .set()', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title',
        userId: 999,          // protected — must be ignored
        id: 999,              // protected — must be ignored
        createdAt: '2000-01-01', // protected — must be ignored
      }),
    })

    expect(res.status).toBe(200)

    // Verify .set() was called
    expect(mocks.mockSet).toHaveBeenCalledOnce()
    const setArgs = mocks.mockSet.mock.calls[0][0] as Record<string, unknown>

    // Protected fields must NOT appear in the .set() call
    expect(setArgs).not.toHaveProperty('userId')
    expect(setArgs).not.toHaveProperty('id')
    expect(setArgs).not.toHaveProperty('createdAt')
  })

  it('allows valid fields (title, description, priority, status, acceptanceCriteria) to be updated', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Title',
        description: 'New description',
        priority: 'high',
        status: 'in_progress',
        acceptanceCriteria: ['criterion 1', 'criterion 2'],
      }),
    })

    expect(res.status).toBe(200)

    expect(mocks.mockSet).toHaveBeenCalledOnce()
    const setArgs = mocks.mockSet.mock.calls[0][0] as Record<string, unknown>

    expect(setArgs.title).toBe('New Title')
    expect(setArgs.description).toBe('New description')
    expect(setArgs.priority).toBe('high')
    expect(setArgs.status).toBe('in_progress')
    // acceptanceCriteria is JSON-stringified
    expect(setArgs.acceptanceCriteria).toBe(JSON.stringify(['criterion 1', 'criterion 2']))
  })

  it('returns 401 when user is not authenticated', async () => {
    const app = new Hono<AppEnv>()
    app.use('*', async (c, next) => {
      c.set('user', null)
      c.set('session', null)
      await next()
    })
    app.route('/', specRoutes)

    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated user does not own the spec', async () => {
    // The found spec has userId = 1 but the requesting user has userId = 2
    const app = createTestApp(2)

    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hijack attempt' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns 404 when spec does not exist', async () => {
    mocks.mockWhere.mockResolvedValueOnce([]) // empty result = not found

    const app = createTestApp()

    const res = await app.request('/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Ghost update' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid spec ID', async () => {
    const app = createTestApp()

    const res = await app.request('/not-a-number', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    })

    expect(res.status).toBe(400)
  })
})
