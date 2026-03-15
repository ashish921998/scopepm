import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mock setup — must run before any imports that touch '../db'
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // Select chain for email check: select().from().where().limit() → await
  const mockLimit = vi.fn()
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
  const mockFrom = vi.fn()
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  // Insert chain: insert(table).values({...}) → await
  const mockInsertValues = vi.fn()
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

  return { mockLimit, mockWhere, mockFrom, mockSelect, mockInsertValues, mockInsert }
})

const mockDb = {
  select: mocks.mockSelect,
  insert: mocks.mockInsert,
}

import waitlistRoutes from '../routes/waitlist'
import { Hono } from 'hono'
import type { AppEnv } from '../lib/hono'

function createWaitlistApp() {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('db', mockDb as any)
    await next()
  })
  app.route('/', waitlistRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockWaitlistEntry = {
  id: 1,
  email: 'existing@example.com',
  name: 'Existing User',
  role: null,
  companySize: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

// ---------------------------------------------------------------------------
// Tests: POST /api/waitlist
// ---------------------------------------------------------------------------
describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: from() returns chain continuation so .where().limit() works
    mocks.mockFrom.mockReturnValue({ where: mocks.mockWhere })
    // Default: no existing email in DB (new entry)
    mocks.mockLimit.mockResolvedValue([])
    // Default: insert succeeds
    mocks.mockInsertValues.mockResolvedValue([])
  })

  it('returns 201 with success for valid new email', async () => {
    const res = await createWaitlistApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', name: 'New User' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json() as { success: boolean; message: string }
    expect(body.success).toBe(true)
    expect(body.message).toBe('Successfully joined waitlist')
  })

  it('returns 201 with only email provided (no optional fields)', async () => {
    const res = await createWaitlistApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'minimal@example.com' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 400 for email without @ symbol', async () => {
    const res = await createWaitlistApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/email/i)
  })

  it('returns 400 when email field is missing', async () => {
    const res = await createWaitlistApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User without email' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/email/i)
  })

  it('returns 400 when email is an empty string', async () => {
    const res = await createWaitlistApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 200 with alreadyExists flag for duplicate email', async () => {
    // Simulate finding the email already in the DB
    mocks.mockLimit.mockResolvedValueOnce([mockWaitlistEntry])

    const res = await createWaitlistApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@example.com' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { alreadyExists: boolean; message: string }
    expect(body.alreadyExists).toBe(true)
    expect(body.message).toBe('Email already registered')
  })

  it('does NOT call insert for a duplicate email', async () => {
    mocks.mockLimit.mockResolvedValueOnce([mockWaitlistEntry])

    await createWaitlistApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@example.com' }),
    })

    expect(mocks.mockInsert).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Tests: GET /api/waitlist/count
// ---------------------------------------------------------------------------
describe('GET /api/waitlist/count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // For count endpoint: db.select({...}).from(waitlist) is awaited directly —
    // override mockFrom to resolve as a Promise (not return a .where() chain)
    mocks.mockFrom.mockResolvedValue([{ value: 42 }])
  })

  it('returns 200 with a numeric count', async () => {
    const res = await createWaitlistApp().request('/count')

    expect(res.status).toBe(200)
    const body = await res.json() as { count: number }
    expect(typeof body.count).toBe('number')
    expect(body.count).toBe(42)
  })

  it('returns count of 0 when waitlist is empty', async () => {
    mocks.mockFrom.mockResolvedValueOnce([{ value: 0 }])

    const res = await createWaitlistApp().request('/count')

    expect(res.status).toBe(200)
    const body = await res.json() as { count: number }
    expect(body.count).toBe(0)
  })

  it('returns 200 with count 0 when db returns no rows (graceful fallback)', async () => {
    mocks.mockFrom.mockResolvedValueOnce([])

    const res = await createWaitlistApp().request('/count')

    expect(res.status).toBe(200)
    const body = await res.json() as { count: number }
    expect(body.count).toBe(0)
  })
})
