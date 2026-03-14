import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { userProfile } from '../db/schema'
import { getUserId, parseStringArray } from '../lib/utils'
import { AppEnv } from '../lib/hono'

const app = new Hono<AppEnv>()

function parseGoals(value: string | null): string[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

app.get('/status', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))

  return c.json({
    onboardingCompleted: profile?.onboardingCompleted ?? false,
    profile: profile
      ? {
          ...profile,
          goals: parseGoals(profile.goals),
        }
      : null,
  })
})

app.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const body = await c.req.json()
  const role = typeof body.role === 'string' ? body.role.trim() : ''
  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : ''
  const teamSize = typeof body.teamSize === 'string' ? body.teamSize.trim() : ''
  const goals = parseStringArray(body.goals)

  if (!role || !companyName || !teamSize || goals.length === 0) {
    return c.json({ error: 'Role, company name, team size, and goals are required' }, 400)
  }

  const [profile] = await db
    .insert(userProfile)
    .values({
      userId,
      role,
      companyName,
      teamSize,
      goals: JSON.stringify(goals),
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: {
        role,
        companyName,
        teamSize,
        goals: JSON.stringify(goals),
        onboardingCompleted: true,
        updatedAt: new Date(),
      },
    })
    .returning()

  return c.json({
    onboardingCompleted: true,
    profile: {
      ...profile,
      goals,
    },
  })
})

export default app
