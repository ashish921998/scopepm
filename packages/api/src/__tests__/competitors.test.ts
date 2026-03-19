import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/hono'

// ---------------------------------------------------------------------------
// Hoisted mock setup
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere })

  const mockInsertReturning = vi.fn()
  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning })
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

  const mockUpdateReturning = vi.fn()
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning })
  const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

  const mockFrom = vi.fn()
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  return {
    mockDeleteWhere, mockDelete,
    mockInsertReturning, mockInsertValues, mockInsert,
    mockUpdateReturning, mockUpdateWhere, mockSet, mockUpdate,
    mockFrom, mockSelect,
  }
})

const mockDb = {
  select: mocks.mockSelect,
  insert: mocks.mockInsert,
  update: mocks.mockUpdate,
  delete: mocks.mockDelete,
}

import competitorRoutes from '../routes/competitors'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_USER_ID = 1
const MOCK_COMPETITOR_ID = 50
const MOCK_PROJECT_ID = 10

const mockProject = {
  id: MOCK_PROJECT_ID,
  userId: MOCK_USER_ID,
  name: 'Test Project',
  description: 'A test project',
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

const mockCompetitor = {
  id: MOCK_COMPETITOR_ID,
  userId: MOCK_USER_ID,
  projectId: MOCK_PROJECT_ID,
  url: 'https://example.com',
  name: 'Example Corp',
  description: 'A competitor',
  features: JSON.stringify(['feature1', 'feature2']),
  pricing: 'Free tier available',
  positioning: 'Targets startups',
  status: 'analyzed',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------
function createTestApp(userId = MOCK_USER_ID) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', { id: String(userId), email: 'test@example.com', name: 'Test User' } as any)
    c.set('session', {} as any)
    c.set('db', mockDb as any)
    await next()
  })
  app.route('/', competitorRoutes)
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
  app.route('/', competitorRoutes)
  return app
}

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
// Tests: GET /api/competitors
// ---------------------------------------------------------------------------
describe('GET /api/competitors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: true, result: [] }),
    )
  })

  it('returns 200 with empty competitors array', async () => {
    const app = createTestApp()
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json() as { competitors: unknown[] }
    expect(body.competitors).toHaveLength(0)
  })

  it('returns 200 with competitors for authenticated user', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: true, result: [mockCompetitor] }),
    )
    const app = createTestApp()
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json() as { competitors: Array<Record<string, unknown>> }
    expect(body.competitors).toHaveLength(1)
    expect(body.competitors[0].name).toBe('Example Corp')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/')
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid projectId query param', async () => {
    const app = createTestApp()
    const res = await app.request('/?projectId=not-a-number')
    expect(res.status).toBe(400)
  })

  it('returns filtered competitors when valid projectId is provided', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence(
        { withOrderBy: false, result: [mockProject] },
        { withOrderBy: true, result: [mockCompetitor] },
      ),
    )
    const app = createTestApp()
    const res = await app.request(`/?projectId=${MOCK_PROJECT_ID}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { competitors: Array<Record<string, unknown>> }
    expect(body.competitors).toHaveLength(1)
  })

  it('returns 404 when projectId filter references non-existent project', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )
    const app = createTestApp()
    const res = await app.request('/?projectId=9999')
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/competitors/:id
// ---------------------------------------------------------------------------
describe('GET /api/competitors/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockCompetitor] }),
    )
  })

  it('returns 200 with competitor data for authenticated owner', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { competitor: Record<string, unknown> }
    expect(body.competitor.id).toBe(MOCK_COMPETITOR_ID)
  })

  it('returns 400 for non-numeric ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number')
    expect(res.status).toBe(400)
  })

  it('returns 404 when competitor does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )
    const app = createTestApp()
    const res = await app.request('/9999')
    expect(res.status).toBe(404)
  })

  it('returns 403 when user does not own the competitor', async () => {
    const app = createTestApp(2)
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`)
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`)
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/competitors
// ---------------------------------------------------------------------------
describe('POST /api/competitors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockProject] }),
    )
    mocks.mockInsertReturning.mockResolvedValue([
      { ...mockCompetitor, status: 'pending', name: null, description: null, features: null, pricing: null, positioning: null },
    ])
  })

  it('creates a competitor and returns 201', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://competitor.com', projectId: MOCK_PROJECT_ID }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { competitor: Record<string, unknown> }
    expect(body).toHaveProperty('competitor')
  })

  it('returns 400 when URL is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: MOCK_PROJECT_ID }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL does not start with http', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'ftp://bad.com', projectId: MOCK_PROJECT_ID }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when projectId is missing', async () => {
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://competitor.com' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://competitor.com', projectId: MOCK_PROJECT_ID }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when project does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )
    const app = createTestApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://competitor.com', projectId: 9999 }),
    })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: PUT /api/competitors/:id
// ---------------------------------------------------------------------------
describe('PUT /api/competitors/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockCompetitor] }),
    )
    mocks.mockUpdateReturning.mockResolvedValue([{ ...mockCompetitor, name: 'Updated Corp' }])
    mocks.mockUpdateWhere.mockReturnValue({ returning: mocks.mockUpdateReturning })
    mocks.mockSet.mockReturnValue({ where: mocks.mockUpdateWhere })
    mocks.mockUpdate.mockReturnValue({ set: mocks.mockSet })
  })

  it('returns 200 with updated competitor', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Corp' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { competitor: Record<string, unknown> }
    expect(body.competitor.name).toBe('Updated Corp')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user does not own the competitor', async () => {
    const app = createTestApp(2)
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hijack' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 when competitor does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )
    const app = createTestApp()
    const res = await app.request('/9999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ghost' }),
    })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Tests: DELETE /api/competitors/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/competitors/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [mockCompetitor] }),
    )
    mocks.mockDeleteWhere.mockResolvedValue(undefined)
  })

  it('returns 200 with success', async () => {
    const app = createTestApp()
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 when competitor does not exist', async () => {
    mocks.mockFrom.mockImplementation(
      makeFromSequence({ withOrderBy: false, result: [] }),
    )
    const app = createTestApp()
    const res = await app.request('/9999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 403 when user does not own the competitor', async () => {
    const app = createTestApp(2)
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`, { method: 'DELETE' })
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request(`/${MOCK_COMPETITOR_ID}`, { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('returns 400 for non-numeric ID', async () => {
    const app = createTestApp()
    const res = await app.request('/not-a-number', { method: 'DELETE' })
    expect(res.status).toBe(400)
  })
})
