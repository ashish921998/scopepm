import { Hono } from 'hono'
import { db } from '../db'
import { interview } from '../db/schema'
import { desc, eq } from 'drizzle-orm'
import { getUserId } from '../lib/utils'
import { AppEnv } from '../lib/hono'

const app = new Hono<AppEnv>()

/**
 * Dev/test endpoint: mark the most recent interview for the current user as "analyzed"
 * with a test summary and insights. Used by validators to set up test state for VAL-DATA-007.
 */
app.post('/seed-analyzed-interview', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)

  const [latest] = await db
    .select()
    .from(interview)
    .where(eq(interview.userId, userId))
    .orderBy(desc(interview.createdAt))
    .limit(1)

  if (!latest) {
    return c.json({ error: 'No interviews found. Please create an interview first.' }, 404)
  }

  const [updated] = await db
    .update(interview)
    .set({
      status: 'analyzed',
      summary: 'Test summary for validation purposes',
      insights: JSON.stringify([{ type: 'pain_point', text: 'Test insight' }]),
      updatedAt: new Date(),
    })
    .where(eq(interview.id, latest.id))
    .returning()

  return c.json({ interview: updated })
})

export default app
