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

vi.mock('../db', () => ({
  db: {
    select: mocks.mockSelect,
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
    delete: mocks.mockDelete,
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
const MOCK_PROJECT_ID = 10
const MOCK_INTERVIEW_ID = 20

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
  title: 'Test Interview',
  transcript: 'Transcript content',
  summary: 'Summary text',
  insights: JSON.stringify([{ type: 'pain_point', text: 'Test insight' }]),
  status: 'analyzed',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

const mockSpec = {
  id: MOCK_SPEC_ID,
  userId: MOCK_USER_ID,
  projectId: MOCK_PROJECT_ID,
  interviewId: null,
  title: 'Original Title',
  description: 'Original description of the feature spec',
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

function createUnauthApp() {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', null)
    c.set('session', null)
    await next()
  })
  app.route('/', specRoutes)
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
// Tests: GET /api/specs
// ---------------------------------------------------------------------------
describe('GET /api/specs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: single SELECT with orderBy — returns empty list
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: true, result: [] }),
    )
  })

  it('returns 200 with empty specs array', async () => {
    const app = createTestApp()
    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json() as { specs: unknown[] }
    expect(body).toHaveProperty('specs')
    expect(Array.isArray(body.specs)).toBe(true)
    expect(body.specs).toHaveLength(0)
  })

  it('returns 200 with specs array for authenticated user', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: true, result: [mockSpec] }),
    )

    const app = createTestApp()
    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json() as { specs: Array<Record<string, unknown>> }
    expect(body.specs).toHaveLength(1)
    expect(body.specs[0].title).toBe('Original Title')
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

  it('returns filtered specs when valid projectId is provided', async () => {
    // Two queries: project ownership check + spec list with orderBy
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockProject] },
        { withOrderBy: true, result: [mockSpec] },
      ),
    )

    const app = createTestApp()
    const res = await app.request(`/?projectId=${MOCK_PROJECT_ID}`)

    expect(res.status).toBe(200)
    const body = await res.json() as { specs: Array<Record<string, unknown>> }
    expect(body.specs).toHaveLength(1)
  })

  it('returns 404 when projectId filter references non-existent project', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }), // project not found
    )

    const app = createTestApp()
    const res = await app.request('/?projectId=9999')

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/specs
// ---------------------------------------------------------------------------
describe('POST /api/specs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: project ownership check succeeds
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockProject] }),
    )
    // Default: insert returns the created spec
    mocks.mockInsertReturning.mockResolvedValue([mockSpec])
  })

  it('creates a spec and returns 201', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Spec',
        description: 'Description of the new feature spec',
        projectId: MOCK_PROJECT_ID,
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json() as { spec: Record<string, unknown> }
    expect(body).toHaveProperty('spec')
  })

  it('returns 400 when title is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Description of the feature spec',
        projectId: MOCK_PROJECT_ID,
      }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body).toHaveProperty('error')
  })

  it('returns 400 when description is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Spec',
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
        title: 'New Spec',
        description: 'Description of the feature spec',
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
        title: 'New Spec',
        description: 'Description of the feature spec',
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
        title: 'New Spec',
        description: 'Description of the feature spec',
        projectId: 9999,
      }),
    })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/specs/:id
// ---------------------------------------------------------------------------
describe('GET /api/specs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockSpec] }),
    )
  })

  it('returns 200 with spec data for authenticated owner', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_SPEC_ID}`)

    expect(res.status).toBe(200)
    const body = await res.json() as { spec: Record<string, unknown> }
    expect(body).toHaveProperty('spec')
    expect(body.spec.id).toBe(MOCK_SPEC_ID)
    expect(body.spec.title).toBe('Original Title')
  })

  it('returns 400 for non-numeric spec ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number')

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body).toHaveProperty('error')
  })

  it('returns 404 when spec does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )

    const app = createTestApp()
    const res = await app.request('/9999')

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 403 when authenticated user does not own the spec', async () => {
    const app = createTestApp(2) // different user

    const res = await app.request(`/${MOCK_SPEC_ID}`)

    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_SPEC_ID}`)

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/specs/generate (error cases only — no real AI calls)
// ---------------------------------------------------------------------------
describe('POST /api/specs/generate', () => {
  const savedApiKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    // Remove API key to trigger error path
    delete process.env.ANTHROPIC_API_KEY
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockInterview] }),
    )
  })

  afterEach(() => {
    if (savedApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedApiKey
    } else {
      delete process.env.ANTHROPIC_API_KEY
    }
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId: MOCK_INTERVIEW_ID }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 400 when interviewId is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/interview/i)
  })

  it('returns 500 with error message when ANTHROPIC_API_KEY is missing', async () => {
    // Interview has insights so it will reach the API key check
    const app = createTestApp()
    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId: MOCK_INTERVIEW_ID }),
    })

    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body).toHaveProperty('error')
    expect(body.error).toMatch(/api key/i)
  })
})

// ---------------------------------------------------------------------------
// Tests: PUT /api/specs/:id — field whitelist security
// ---------------------------------------------------------------------------
describe('PUT /api/specs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // PUT does two SELECT queries:
    // 1. Find spec by id (no orderBy)
    // 2. Find project by id for ownership check (no orderBy)
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockSpec] },    // spec lookup
        { withOrderBy: false, result: [mockProject] }, // project ownership check
      ),
    )

    // Default: update returns updated spec
    mocks.mockUpdateReturning.mockResolvedValue([{ ...mockSpec, updatedAt: new Date() }])
    mocks.mockUpdateWhere.mockReturnValue({ returning: mocks.mockUpdateReturning })
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
        userId: 999,            // protected — must be ignored
        id: 999,                // protected — must be ignored
        createdAt: '2000-01-01', // protected — must be ignored
      }),
    })

    expect(res.status).toBe(200)

    expect(mocks.mockSet).toHaveBeenCalledOnce()
    const setArgs = mocks.mockSet.mock.calls[0][0] as Record<string, unknown>

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
    expect(setArgs.acceptanceCriteria).toBe(JSON.stringify(['criterion 1', 'criterion 2']))
  })

  it('returns 401 when user is not authenticated', async () => {
    const app = createUnauthApp()

    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated user does not own the spec', async () => {
    const app = createTestApp(2) // different user

    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hijack attempt' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns 404 when spec does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )

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

// ---------------------------------------------------------------------------
// Tests: DELETE /api/specs/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/specs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockSpec] }),
    )
    mocks.mockDeleteWhere.mockResolvedValue(undefined)
  })

  it('returns 200 with success on valid delete', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 when spec does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )

    const app = createTestApp()
    const res = await app.request('/9999', {
      method: 'DELETE',
    })

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 400 for invalid (non-numeric) spec ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number', {
      method: 'DELETE',
    })

    expect(res.status).toBe(400)
  })

  it('returns 403 when user does not own the spec', async () => {
    const app = createTestApp(2) // different user

    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_SPEC_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(401)
  })
})
