import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { waitlist } from '../db'
import { eq, count } from 'drizzle-orm'
import { AppEnv } from '../lib/hono'
import { logger } from '../lib/logger'

const app = new Hono<AppEnv>()

// Enable CORS for frontend
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// POST /api/waitlist - Submit email to waitlist
app.post('/', async (c) => {
  try {
    const db = c.get('db')
    const body = await c.req.json()
    const { email, name, role, companySize } = body

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Valid email is required' }, 400)
    }

    // Check if email already exists
    const existing = await db.select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1)

    if (existing.length > 0) {
      return c.json({ message: 'Email already registered', alreadyExists: true }, 200)
    }

    // Insert new entry
    await db.insert(waitlist).values({
      email,
      name: name || null,
      role: role || null,
      companySize: companySize || null,
    })

    return c.json({ message: 'Successfully joined waitlist', success: true }, 201)
  } catch (error) {
    logger.error('Waitlist signup failed', error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) })
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/waitlist/count - Get total count for social proof
app.get('/count', async (c) => {
  try {
    const db = c.get('db')
    const result = await db.select({ value: count() })
      .from(waitlist)

    const countValue = result[0]?.value || 0
    return c.json({ count: countValue }, 200)
  } catch (error) {
    logger.error('Waitlist count fetch failed', error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) })
    return c.json({ count: 0 }, 200)
  }
})

export default app
