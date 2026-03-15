import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/hono'

// ---------------------------------------------------------------------------
// Hoisted mock setup — must run before any imports that touch '../db'
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // DELETE chain: db.delete(table).where(condition) → await
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere })

  // INSERT chain: db.insert(table).values({...}).returning() → await
  const mockInsertReturning = vi.fn()
  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning })
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

  // UPDATE chain: db.update(table).set({...}).where(cond).returning() → await
  const mockUpdateReturning = vi.fn()
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning })
  const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

  // SELECT chain: db.select().from(table)... chains vary by handler
  const mockFrom = vi.fn()
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  return {
    mockDeleteWhere,
    mockDelete,
    mockInsertReturning,
    mockInsertValues,
    mockInsert,
    mockUpdateReturning,
    mockUpdateWhere,
    mockSet,
    mockUpdate,
    mockFrom,
    mockSelect,
  }
})

const mockDb = {
  select: mocks.mockSelect,
  insert: mocks.mockInsert,
  update: mocks.mockUpdate,
  delete: mocks.mockDelete,
}

import interviewRoutes from '../routes/interviews'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_USER_ID = 1
const MOCK_INTERVIEW_ID = 42
const MOCK_PROJECT_ID = 10

const mockProject = {
  id: MOCK_PROJECT_ID,
  userId: MOCK_USER_ID,
  name: 'Test Project',
  description: 'A test project description',
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

const mockInterview = {
  id: MOCK_INTERVIEW_ID,
  userId: MOCK_USER_ID,
  projectId: MOCK_PROJECT_ID,
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
    c.set('db', mockDb as any)
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
    c.set('db', mockDb as any)
    await next()
  })
  app.route('/', interviewRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Helper: builds a mock for mockFrom that serves a sequence of DB query
// patterns. Each element specifies whether the query has a trailing
// .orderBy() call and what array to return.
// ---------------------------------------------------------------------------
type FromConfig = { withOrderBy: boolean; result: unknown[] }

function makeFromSequence(...configs: FromConfig[]) {
  let callIdx = 0
  return () => {
    const config = configs[callIdx++] ?? { withOrderBy: false, result: [] }
    if (config.withOrderBy) {
      const orderByFn = vi.fn().mockResolvedValue(config.result)
      return { where: vi.fn().mockReturnValue({ orderBy: orderByFn }) }
    }
    return { where: vi.fn().mockResolvedValue(config.result) }
  }
}

// ---------------------------------------------------------------------------
// Tests: GET /api/interviews
// ---------------------------------------------------------------------------
describe('GET /api/interviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Single SELECT: interviews with orderBy
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: true, result: [] }),
    )
  })

  it('returns 200 with empty interviews array', async () => {
    const app = createTestApp()
    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json() as { interviews: unknown[] }
    expect(body).toHaveProperty('interviews')
    expect(Array.isArray(body.interviews)).toBe(true)
    expect(body.interviews).toHaveLength(0)
  })

  it('returns 200 with interviews for authenticated user', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: true, result: [mockInterview] }),
    )

    const app = createTestApp()
    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json() as { interviews: Array<Record<string, unknown>> }
    expect(body.interviews).toHaveLength(1)
    expect(body.interviews[0].title).toBe('Original Title')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 for invalid (non-numeric) projectId query param', async () => {
    const app = createTestApp()
    const res = await app.request('/?projectId=not-a-number')

    expect(res.status).toBe(400)
  })

  it('returns filtered interviews when valid projectId is provided', async () => {
    // Two queries: project ownership check (no orderBy) + interview list (orderBy)
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockProject] },
        { withOrderBy: true, result: [mockInterview] },
      ),
    )

    const app = createTestApp()
    const res = await app.request(`/?projectId=${MOCK_PROJECT_ID}`)

    expect(res.status).toBe(200)
    const body = await res.json() as { interviews: Array<Record<string, unknown>> }
    expect(body.interviews).toHaveLength(1)
  })

  it('returns 404 when projectId filter references non-existent project', async () => {
    // Project ownership check returns empty (not found or not owned)
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )

    const app = createTestApp()
    const res = await app.request('/?projectId=9999')

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/interviews
// ---------------------------------------------------------------------------
describe('POST /api/interviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // SELECT for project ownership check
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockProject] }),
    )
    // INSERT returns the created interview (status: pending, no summary/insights yet)
    mocks.mockInsertReturning.mockResolvedValue([
      { ...mockInterview, status: 'pending', summary: null, insights: null },
    ])
  })

  it('creates an interview and returns 201', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Interview',
        transcript: 'Full transcript content',
        projectId: MOCK_PROJECT_ID,
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json() as { interview: Record<string, unknown> }
    expect(body).toHaveProperty('interview')
  })

  it('returns 400 when title is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Full transcript content',
        projectId: MOCK_PROJECT_ID,
      }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body).toHaveProperty('error')
  })

  it('returns 400 when transcript is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Interview',
        projectId: MOCK_PROJECT_ID,
      }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when projectId is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Interview',
        transcript: 'Full transcript content',
      }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Interview',
        transcript: 'Full transcript content',
        projectId: MOCK_PROJECT_ID,
      }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 404 when referenced project does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }), // project not found
    )

    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Interview',
        transcript: 'Full transcript content',
        projectId: 9999,
      }),
    })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/interviews/:id
// ---------------------------------------------------------------------------
describe('GET /api/interviews/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockInterview] }),
    )
  })

  it('returns 200 with interview data for authenticated owner', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_INTERVIEW_ID}`)

    expect(res.status).toBe(200)
    const body = await res.json() as { interview: Record<string, unknown> }
    expect(body).toHaveProperty('interview')
    expect(body.interview.id).toBe(MOCK_INTERVIEW_ID)
    expect(body.interview.title).toBe('Original Title')
  })

  it('returns 400 for non-numeric interview ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number')

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body).toHaveProperty('error')
  })

  it('returns 404 when interview does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )

    const app = createTestApp()
    const res = await app.request('/9999')

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 403 when authenticated user does not own the interview', async () => {
    const app = createTestApp(2) // different user

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`)

    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_INTERVIEW_ID}`)

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: PUT /api/interviews/:id
// ---------------------------------------------------------------------------
describe('PUT /api/interviews/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: select returns the mock interview (ownership passes)
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockInterview] }),
    )

    // Default: update returns updated interview
    mocks.mockUpdateReturning.mockResolvedValue([{ ...mockInterview, title: 'Updated Title', updatedAt: new Date() }])
    mocks.mockUpdateWhere.mockReturnValue({ returning: mocks.mockUpdateReturning })
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
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }), // empty result = not found
    )

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

// ---------------------------------------------------------------------------
// Tests: DELETE /api/interviews/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/interviews/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockInterview] }),
    )
    mocks.mockDeleteWhere.mockResolvedValue(undefined)
  })

  it('returns 200 with success on valid delete', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 when interview does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }), // not found
    )

    const app = createTestApp()
    const res = await app.request('/9999', {
      method: 'DELETE',
    })

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 400 for invalid (non-numeric) interview ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number', {
      method: 'DELETE',
    })

    expect(res.status).toBe(400)
  })

  it('returns 403 when user does not own the interview', async () => {
    const app = createTestApp(2) // different user

    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_INTERVIEW_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/interviews/:id/analyze (error cases only — no real AI calls)
// ---------------------------------------------------------------------------
describe('POST /api/interviews/:id/analyze', () => {
  const savedApiKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    // Remove API key to trigger the error-path we want to test
    delete process.env.ANTHROPIC_API_KEY
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockInterview] }),
    )
  })

  afterEach(() => {
    // Restore original value (may be undefined in CI)
    if (savedApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedApiKey
    } else {
      delete process.env.ANTHROPIC_API_KEY
    }
  })

  it('returns 500 with error message when ANTHROPIC_API_KEY is missing', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_INTERVIEW_ID}/analyze`, {
      method: 'POST',
    })

    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body).toHaveProperty('error')
    expect(body.error).toMatch(/api key/i)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_INTERVIEW_ID}/analyze`, {
      method: 'POST',
    })

    expect(res.status).toBe(401)
  })
})
