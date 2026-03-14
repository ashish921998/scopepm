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
import interviewRoutes from '../routes/interviews'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_USER_ID = 1
const MOCK_INTERVIEW_ID = 42

const mockInterview = {
  id: MOCK_INTERVIEW_ID,
  userId: MOCK_USER_ID,
  projectId: 1,
  title: 'Original Title',
  transcript: 'Original transcript content here',
  summary: 'Some summary',
  insights: JSON.stringify({ painPoints: ['Point A'] }),
  status: 'analyzed',
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
  app.route('/', interviewRoutes)
  return app
}

function createUnauthApp() {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', null)
    c.set('session', null)
    await next()
  })
  app.route('/', interviewRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PUT /api/interviews/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: select returns the mock interview (ownership passes)
    mocks.mockWhere.mockResolvedValue([mockInterview])

    // Default: update returns updated interview
    mocks.mockReturning.mockResolvedValue([{ ...mockInterview, title: 'Updated Title', updatedAt: new Date() }])
    mocks.mockUpdateWhere.mockReturnValue({ returning: mocks.mockReturning })
    mocks.mockSet.mockReturnValue({ where: mocks.mockUpdateWhere })
    mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet })
  })

  it('returns 200 with updated interview on valid request', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title', transcript: 'Updated transcript content' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { interview: Record<string, unknown> }
    expect(body).toHaveProperty('interview')
    expect(body.interview.title).toBe('Updated Title')
  })

  it('returns 401 when user is not authenticated', async () => {
    const app = createUnauthApp()

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', transcript: 'Some transcript' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 400 for non-numeric interview ID', async () => {
    const app = createTestApp()

    const res = await app.request('/not-a-number', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', transcript: 'Some transcript' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 404 when interview does not exist', async () => {
    mocks.mockWhere.mockResolvedValueOnce([]) // empty result = not found

    const app = createTestApp()

    const res = await app.request('/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Ghost update', transcript: 'Some transcript' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 403 when authenticated user does not own the interview', async () => {
    // The found interview has userId = 1 but the requesting user has userId = 2
    const app = createTestApp(2)

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hijack', transcript: 'Some transcript' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns 400 when title is empty', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', transcript: 'Some transcript' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when transcript is empty', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Some title', transcript: '' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when title is missing', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Some transcript' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when transcript is missing', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Some title' }),
    })

    expect(res.status).toBe(400)
  })

  it('does NOT modify status, summary, or insights in .set()', async () => {
    const app = createTestApp()

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title',
        transcript: 'Updated transcript',
        status: 'pending',       // should be ignored
        summary: null,           // should be ignored
        insights: null,          // should be ignored
        userId: 999,             // should be ignored
        id: 999,                 // should be ignored
      }),
    })

    expect(res.status).toBe(200)

    // Verify .set() was called
    expect(mocks.mockSet).toHaveBeenCalledOnce()
    const setArgs = mocks.mockSet.mock.calls[0][0] as Record<string, unknown>

    // Only title, transcript, and updatedAt should be set
    expect(setArgs).toHaveProperty('title', 'Updated Title')
    expect(setArgs).toHaveProperty('transcript', 'Updated transcript')
    expect(setArgs).toHaveProperty('updatedAt')

    // Protected/analysis fields must NOT appear
    expect(setArgs).not.toHaveProperty('status')
    expect(setArgs).not.toHaveProperty('summary')
    expect(setArgs).not.toHaveProperty('insights')
    expect(setArgs).not.toHaveProperty('userId')
    expect(setArgs).not.toHaveProperty('id')
  })
})
