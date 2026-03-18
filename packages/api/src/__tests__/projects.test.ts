import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  // from() is configured per test group to return the appropriate chain
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

import projectRoutes from '../routes/projects'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_USER_ID = 1
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
  id: 1,
  userId: MOCK_USER_ID,
  projectId: MOCK_PROJECT_ID,
  title: 'Customer Interview',
  transcript: 'Transcript content',
  summary: null,
  insights: null,
  status: 'pending',
  createdAt: new Date('2024-01-02T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
}

const mockAnalyzedInterview = {
  ...mockInterview,
  id: 2,
  title: 'Analyzed Interview',
  status: 'analyzed',
  summary: 'Summary text',
  insights: JSON.stringify({ painPoints: ['Point A'] }),
}

const mockSpec = {
  id: 1,
  userId: MOCK_USER_ID,
  projectId: MOCK_PROJECT_ID,
  interviewId: null,
  title: 'Feature Spec',
  description: 'Feature description',
  acceptanceCriteria: null,
  priority: 'medium',
  status: 'draft',
  createdAt: new Date('2024-01-02T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
}

// ---------------------------------------------------------------------------
// Test app factories
// ---------------------------------------------------------------------------
function createTestApp(userId = MOCK_USER_ID) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', { id: String(userId), email: 'test@example.com', name: 'Test User' } as any)
    c.set('session', {} as any)
    c.set('db', mockDb as any)
    await next()
  })
  app.route('/', projectRoutes)
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
  app.route('/', projectRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Helper: builds a mock for mockFrom that serves a sequence of DB query
// patterns. Each element specifies whether the query has a trailing
// .orderBy() call and what array to return.
// ---------------------------------------------------------------------------
type FromConfig = { withOrderBy?: boolean; withLimit?: boolean; withGroupBy?: boolean; result: unknown[] }

function makeFromSequence(...configs: FromConfig[]) {
  let callIdx = 0
  return () => {
    const config = configs[callIdx++] ?? { result: [] }
    if (config.withOrderBy) {
      if (config.withLimit) {
        const limitFn = vi.fn().mockResolvedValue(config.result)
        const orderByFn = vi.fn().mockReturnValue({ limit: limitFn })
        return { where: vi.fn().mockReturnValue({ orderBy: orderByFn }) }
      }
      const orderByFn = vi.fn().mockResolvedValue(config.result)
      return { where: vi.fn().mockReturnValue({ orderBy: orderByFn }) }
    }
    if (config.withGroupBy) {
      const groupByFn = vi.fn().mockResolvedValue(config.result)
      return { where: vi.fn().mockReturnValue({ groupBy: groupByFn }) }
    }
    return { where: vi.fn().mockResolvedValue(config.result) }
  }
}

// ---------------------------------------------------------------------------
// Tests: GET /api/projects
// ---------------------------------------------------------------------------
describe('GET /api/projects', () => {
  // Route fires 3 SELECT queries in order:
  //   1. projects  → .where().orderBy()
  //   2. interview stats (COUNT + GROUP BY) → .where().groupBy()
  //   3. spec stats (COUNT + GROUP BY) → .where().groupBy()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: true, result: [] },  // projects
        { withGroupBy: true, result: [] },  // interview stats
        { withGroupBy: true, result: [] },  // spec stats
      ),
    )
  })

  it('returns 200 with projects array for authenticated user', async () => {
    const app = createTestApp()
    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json() as { projects: unknown[] }
    expect(body).toHaveProperty('projects')
    expect(Array.isArray(body.projects)).toBe(true)
  })

  it('enriches projects with interviewCount, specCount and pendingInterviewCount', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: true, result: [mockProject] },
        { withGroupBy: true, result: [{ projectId: MOCK_PROJECT_ID, total: 2, pendingCount: 1 }] },
        { withGroupBy: true, result: [{ projectId: MOCK_PROJECT_ID, total: 1 }] },
      ),
    )

    const app = createTestApp()
    const res = await app.request('/')

    expect(res.status).toBe(200)
    const body = await res.json() as { projects: Array<Record<string, unknown>> }
    expect(body.projects).toHaveLength(1)
    expect(body.projects[0].interviewCount).toBe(2)
    expect(body.projects[0].specCount).toBe(1)
    expect(body.projects[0].pendingInterviewCount).toBe(1)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/projects/overview
// ---------------------------------------------------------------------------
describe('GET /api/projects/overview', () => {
  // Route fires 5 SELECT queries in order:
  //   1. projects  → .where().orderBy()
  //   2. interview stats (COUNT + GROUP BY) → .where().groupBy()
  //   3. spec stats (COUNT + GROUP BY) → .where().groupBy()
  //   4. recent interviews → .where().orderBy().limit()
  //   5. recent specs → .where().orderBy().limit()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: true, result: [] },  // projects
        { withGroupBy: true, result: [] },  // interview stats
        { withGroupBy: true, result: [] },  // spec stats
        { withOrderBy: true, withLimit: true, result: [] },  // recent interviews
        { withOrderBy: true, withLimit: true, result: [] },  // recent specs
      ),
    )
  })

  it('returns 200 with stats, recentActivity, and projects', async () => {
    const app = createTestApp()
    const res = await app.request('/overview')

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('stats')
    expect(body).toHaveProperty('recentActivity')
    expect(body).toHaveProperty('projects')
  })

  it('returns correct stat counts from overview data', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: true, result: [mockProject] },  // projects
        { withGroupBy: true, result: [{ projectId: MOCK_PROJECT_ID, total: 2, pendingCount: 1 }] },  // interview stats
        { withGroupBy: true, result: [{ projectId: MOCK_PROJECT_ID, total: 1 }] },  // spec stats
        { withOrderBy: true, withLimit: true, result: [mockInterview, mockAnalyzedInterview] },  // recent interviews
        { withOrderBy: true, withLimit: true, result: [mockSpec] },  // recent specs
      ),
    )

    const app = createTestApp()
    const res = await app.request('/overview')

    expect(res.status).toBe(200)
    const body = await res.json() as { stats: Record<string, number> }
    expect(body.stats.projectCount).toBe(1)
    expect(body.stats.interviewCount).toBe(2)
    expect(body.stats.specCount).toBe(1)
    expect(body.stats.pendingInterviewCount).toBe(1)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/overview')

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/projects
// ---------------------------------------------------------------------------
describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockInsertReturning.mockResolvedValue([
      { ...mockProject, interviewCount: 0, specCount: 0, pendingInterviewCount: 0 },
    ])
  })

  it('creates a project and returns 201 with project data', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project', description: 'Some description' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json() as { project: Record<string, unknown> }
    expect(body).toHaveProperty('project')
    expect(body.project.name).toBe('Test Project')
    expect(body.project.interviewCount).toBe(0)
    expect(body.project.specCount).toBe(0)
  })

  it('returns 400 when project name is empty string', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/name/i)
  })

  it('returns 400 when name is whitespace only', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when name field is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'No name here' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Project' }),
    })

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/projects/:id
// ---------------------------------------------------------------------------
describe('GET /api/projects/:id', () => {
  // Queries:
  //   1. getOwnedProject → .where()  (no orderBy)
  //   2. interviews      → .where().orderBy()
  //   3. specs           → .where().orderBy()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockProject] },        // getOwnedProject
        { withOrderBy: true, result: [mockInterview] },       // interviews
        { withOrderBy: true, result: [mockSpec] },            // specs
      ),
    )
  })

  it('returns 200 with project, recentInterviews, and recentSpecs', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`)

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('project')
    expect(body).toHaveProperty('recentInterviews')
    expect(body).toHaveProperty('recentSpecs')
  })

  it('returns correct counts and interview/spec lists', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`)

    expect(res.status).toBe(200)
    const body = await res.json() as {
      project: Record<string, unknown>
      recentInterviews: unknown[]
      recentSpecs: unknown[]
    }
    expect(body.recentInterviews).toHaveLength(1)
    expect(body.recentSpecs).toHaveLength(1)
    expect(body.project.interviewCount).toBe(1)
    expect(body.project.specCount).toBe(1)
  })

  it('returns 400 for non-numeric project ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number')

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/invalid/i)
  })

  it('returns 404 when project does not exist', async () => {
    // Override: getOwnedProject returns empty (project not found or not owned)
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [] }, // not found
      ),
    )

    const app = createTestApp()
    const res = await app.request('/9999')

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`)

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/projects/:id/stats
// ---------------------------------------------------------------------------
describe('GET /api/projects/:id/stats', () => {
  // Queries:
  //   1. getOwnedProject → .where()  (no orderBy)
  //   2. interview counts (COUNT aggregate) → .where()  (no orderBy)
  //   3. spec counts (COUNT aggregate) → .where()  (no orderBy)
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockProject] },
        { withOrderBy: false, result: [{ total: 2, pendingCount: 1, analyzedCount: 1 }] },
        { withOrderBy: false, result: [{ total: 1 }] },
      ),
    )
  })

  it('returns 200 with stat counts', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}/stats`)

    expect(res.status).toBe(200)
    const body = await res.json() as { stats: Record<string, number> }
    expect(body).toHaveProperty('stats')
    expect(body.stats.interviewCount).toBe(2)
    expect(body.stats.specCount).toBe(1)
    expect(body.stats.pendingInterviewCount).toBe(1)
    expect(body.stats.analyzedInterviewCount).toBe(1)
  })

  it('returns 400 for invalid (non-numeric) project ID', async () => {
    const app = createTestApp()
    const res = await app.request('/abc/stats')

    expect(res.status).toBe(400)
  })

  it('returns 404 when project does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [] }, // not found
      ),
    )

    const app = createTestApp()
    const res = await app.request('/9999/stats')

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: PUT /api/projects/:id
// ---------------------------------------------------------------------------
describe('PUT /api/projects/:id', () => {
  // Queries:
  //   1. getOwnedProject → .where()  (no orderBy)
  //   2. db.update().set().where().returning()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockProject] }, // getOwnedProject
      ),
    )
    mocks.mockUpdateReturning.mockResolvedValue([{ ...mockProject, name: 'Updated Name' }])
    mocks.mockUpdateWhere.mockReturnValue({ returning: mocks.mockUpdateReturning })
    mocks.mockSet.mockReturnValue({ where: mocks.mockUpdateWhere })
    mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet })
  })

  it('returns 200 with updated project data', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name', description: 'Updated description' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { project: Record<string, unknown> }
    expect(body).toHaveProperty('project')
    expect(body.project.name).toBe('Updated Name')
  })

  it('returns 400 when name is set to empty string', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/name/i)
  })

  it('returns 400 for invalid (non-numeric) project ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 404 when project does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [] }, // not found
      ),
    )

    const app = createTestApp()
    const res = await app.request('/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost update' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: DELETE /api/projects/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/projects/:id', () => {
  // Queries:
  //   1. getOwnedProject → .where()  (no orderBy)
  //   2. db.delete().where()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockProject] }, // getOwnedProject
      ),
    )
    mocks.mockDeleteWhere.mockResolvedValue(undefined)
  })

  it('returns 200 with success on valid delete', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 400 for invalid (non-numeric) project ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number', {
      method: 'DELETE',
    })

    expect(res.status).toBe(400)
  })

  it('returns 404 when project does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [] }, // not found
      ),
    )

    const app = createTestApp()
    const res = await app.request('/9999', {
      method: 'DELETE',
    })

    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_PROJECT_ID}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(401)
  })
})
