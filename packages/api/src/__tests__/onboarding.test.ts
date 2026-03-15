import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/hono'

// ---------------------------------------------------------------------------
// Hoisted mock setup — must run before any imports that touch '../db'
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // Select chain: db.select().from(userProfile).where(eq(...)) → await
  const mockWhere = vi.fn()
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  // Insert upsert chain: db.insert().values().onConflictDoUpdate().returning() → await
  const mockReturning = vi.fn()
  const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning })
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

  return {
    mockWhere,
    mockFrom,
    mockSelect,
    mockReturning,
    mockOnConflictDoUpdate,
    mockValues,
    mockInsert,
  }
})

vi.mock('../db', () => ({
  db: {
    select: mocks.mockSelect,
    insert: mocks.mockInsert,
  },
}))

// ---------------------------------------------------------------------------
// Import route AFTER vi.mock so the mock is in place
// ---------------------------------------------------------------------------
import onboardingRoutes from '../routes/onboarding'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_USER_ID = 1

const mockProfile = {
  id: 10,
  userId: MOCK_USER_ID,
  role: 'product_manager',
  companyName: 'Acme Corp',
  teamSize: '11-50',
  goals: JSON.stringify(['improve_planning', 'better_insights']),
  onboardingCompleted: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
}

// ---------------------------------------------------------------------------
// Test app factories
// ---------------------------------------------------------------------------
function createTestApp(userId = MOCK_USER_ID) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', { id: String(userId), email: 'test@example.com', name: 'Test User' } as any)
    c.set('session', {} as any)
    await next()
  })
  app.route('/', onboardingRoutes)
  return app
}

function createUnauthApp() {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', null)
    c.set('session', null)
    await next()
  })
  app.route('/', onboardingRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Tests: GET /api/onboarding/status
// ---------------------------------------------------------------------------
describe('GET /api/onboarding/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: profile exists and onboarding is complete
    mocks.mockWhere.mockResolvedValue([mockProfile])
  })

  it('returns 200 with onboardingCompleted true when profile exists', async () => {
    const app = createTestApp()

    const res = await app.request('/status')

    expect(res.status).toBe(200)
    const body = await res.json() as { onboardingCompleted: boolean; profile: Record<string, unknown> }
    expect(body.onboardingCompleted).toBe(true)
    expect(body.profile).not.toBeNull()
    expect(body.profile.userId).toBe(MOCK_USER_ID)
  })

  it('returns 200 with onboardingCompleted false when no profile exists', async () => {
    mocks.mockWhere.mockResolvedValueOnce([])

    const app = createTestApp()

    const res = await app.request('/status')

    expect(res.status).toBe(200)
    const body = await res.json() as { onboardingCompleted: boolean; profile: null }
    expect(body.onboardingCompleted).toBe(false)
    expect(body.profile).toBeNull()
  })

  it('returns 200 with goals parsed as array', async () => {
    const app = createTestApp()

    const res = await app.request('/status')

    expect(res.status).toBe(200)
    const body = await res.json() as { profile: { goals: string[] } }
    expect(Array.isArray(body.profile.goals)).toBe(true)
  })

  it('returns 401 when user is not authenticated', async () => {
    const app = createUnauthApp()

    const res = await app.request('/status')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })
})

// ---------------------------------------------------------------------------
// Tests: POST /api/onboarding
// ---------------------------------------------------------------------------
describe('POST /api/onboarding', () => {
  const validPayload = {
    role: 'product_manager',
    companyName: 'Acme Corp',
    teamSize: '11-50',
    goals: ['improve_planning', 'better_insights'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: upsert returns the mock profile
    mocks.mockReturning.mockResolvedValue([mockProfile])
  })

  it('returns 200 with onboardingCompleted true for valid payload', async () => {
    const app = createTestApp()

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { onboardingCompleted: boolean; profile: Record<string, unknown> }
    expect(body.onboardingCompleted).toBe(true)
    expect(body.profile).toBeDefined()
  })

  it('returns 200 with goals echoed back as array', async () => {
    const app = createTestApp()

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { profile: { goals: string[] } }
    expect(Array.isArray(body.profile.goals)).toBe(true)
  })

  it('returns 400 when role is missing', async () => {
    const app = createTestApp()
    const { role: _role, ...payloadWithoutRole } = validPayload

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithoutRole),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBeTruthy()
  })

  it('returns 400 when companyName is missing', async () => {
    const app = createTestApp()
    const { companyName: _cn, ...payloadWithoutCompany } = validPayload

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithoutCompany),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when teamSize is missing', async () => {
    const app = createTestApp()
    const { teamSize: _ts, ...payloadWithoutTeamSize } = validPayload

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithoutTeamSize),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when goals array is empty', async () => {
    const app = createTestApp()

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, goals: [] }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when goals field is missing', async () => {
    const app = createTestApp()
    const { goals: _goals, ...payloadWithoutGoals } = validPayload

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithoutGoals),
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when role is an empty string', async () => {
    const app = createTestApp()

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, role: '' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 401 when user is not authenticated', async () => {
    const app = createUnauthApp()

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    })

    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })
})
