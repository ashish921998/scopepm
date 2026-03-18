import { Hono } from 'hono'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { featureSpec, interview, project } from '../db/schema'
import { getUserId, parseInteger } from '../lib/utils'
import type { Database } from '../db'
import { AppEnv } from '../lib/hono'

const app = new Hono<AppEnv>()

async function getOwnedProject(db: Database, projectId: number, userId: number) {
  const [found] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))

  return found ?? null
}

app.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projects = await db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt))

  // Use COUNT + GROUP BY instead of fetching all rows to count in JS
  const interviewStats = await db
    .select({
      projectId: interview.projectId,
      total: count(),
      pendingCount: sql<number>`count(*) filter (where ${interview.status} = 'pending')`.mapWith(Number),
    })
    .from(interview)
    .where(eq(interview.userId, userId))
    .groupBy(interview.projectId)

  const specStats = await db
    .select({
      projectId: featureSpec.projectId,
      total: count(),
    })
    .from(featureSpec)
    .where(eq(featureSpec.userId, userId))
    .groupBy(featureSpec.projectId)

  const interviewMap = new Map(interviewStats.map((r) => [r.projectId, r]))
  const specMap = new Map(specStats.map((r) => [r.projectId, r]))

  return c.json({
    projects: projects.map((p) => ({
      ...p,
      interviewCount: interviewMap.get(p.id)?.total ?? 0,
      specCount: specMap.get(p.id)?.total ?? 0,
      pendingInterviewCount: interviewMap.get(p.id)?.pendingCount ?? 0,
    })),
  })
})

app.get('/overview', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projects = await db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt))

  const interviewStats = await db
    .select({
      projectId: interview.projectId,
      total: count().mapWith(Number),
      pendingCount: sql<number>`count(*) filter (where ${interview.status} = 'pending')`.mapWith(Number),
    })
    .from(interview)
    .where(eq(interview.userId, userId))
    .groupBy(interview.projectId)

  const specStats = await db
    .select({
      projectId: featureSpec.projectId,
      total: count().mapWith(Number),
    })
    .from(featureSpec)
    .where(eq(featureSpec.userId, userId))
    .groupBy(featureSpec.projectId)

  const interviewMap = new Map(interviewStats.map((r) => [r.projectId, r]))
  const specMap = new Map(specStats.map((r) => [r.projectId, r]))

  const projectNameMap = new Map(projects.map((item) => [item.id, item.name]))

  const recentInterviews = await db
    .select()
    .from(interview)
    .where(eq(interview.userId, userId))
    .orderBy(desc(interview.createdAt))
    .limit(5)

  const recentSpecs = await db
    .select()
    .from(featureSpec)
    .where(eq(featureSpec.userId, userId))
    .orderBy(desc(featureSpec.createdAt))
    .limit(5)

  const interviewItems = recentInterviews.map((item) => ({
    id: item.id,
    type: 'interview' as const,
    title: item.title,
    status: item.status,
    projectId: item.projectId,
    projectName: item.projectId ? projectNameMap.get(item.projectId) ?? null : null,
    createdAt: item.createdAt,
  }))

  const specItems = recentSpecs.map((item) => ({
    id: item.id,
    type: 'spec' as const,
    title: item.title,
    status: item.status,
    projectId: item.projectId,
    projectName: item.projectId ? projectNameMap.get(item.projectId) ?? null : null,
    createdAt: item.createdAt,
  }))

  const recentActivity = [...interviewItems, ...specItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const totalInterviews = interviewStats.reduce((sum, r) => sum + r.total, 0)
  const pendingInterviews = interviewStats.reduce((sum, r) => sum + r.pendingCount, 0)

  const projectsWithCounts = projects.map((item) => ({
    ...item,
    interviewCount: interviewMap.get(item.id)?.total ?? 0,
    specCount: specMap.get(item.id)?.total ?? 0,
    pendingInterviewCount: interviewMap.get(item.id)?.pendingCount ?? 0,
  }))

  return c.json({
    stats: {
      projectCount: projects.length,
      interviewCount: totalInterviews,
      specCount: specStats.reduce((sum, r) => sum + r.total, 0),
      pendingInterviewCount: pendingInterviews,
    },
    recentActivity,
    projects: projectsWithCounts.slice(0, 6),
  })
})

app.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const body = await c.req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const userId = getUserId(user)

  if (!name) {
    return c.json({ error: 'Project name is required' }, 400)
  }

  const [created] = await db
    .insert(project)
    .values({
      userId,
      name,
      description: description || null,
      status: 'active',
    })
    .returning()

  return c.json({ project: { ...created, interviewCount: 0, specCount: 0, pendingInterviewCount: 0 } }, 201)
})

app.get('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(db, projectId, userId)
  if (!found) return c.json({ error: 'Project not found' }, 404)

  const interviews = await db
    .select()
    .from(interview)
    .where(and(eq(interview.userId, userId), eq(interview.projectId, projectId)))
    .orderBy(desc(interview.createdAt))

  const specs = await db
    .select()
    .from(featureSpec)
    .where(and(eq(featureSpec.userId, userId), eq(featureSpec.projectId, projectId)))
    .orderBy(desc(featureSpec.createdAt))

  return c.json({
    project: {
      ...found,
      interviewCount: interviews.length,
      specCount: specs.length,
      pendingInterviewCount: interviews.filter((item) => item.status === 'pending').length,
    },
    recentInterviews: interviews.slice(0, 5),
    recentSpecs: specs.slice(0, 5),
  })
})

app.get('/:id/stats', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(db, projectId, userId)
  if (!found) return c.json({ error: 'Project not found' }, 404)

  // Use COUNT aggregates instead of fetching all rows
  const [interviewCounts] = await db
    .select({
      total: count().mapWith(Number),
      pendingCount: sql<number>`count(*) filter (where ${interview.status} = 'pending')`.mapWith(Number),
      analyzedCount: sql<number>`count(*) filter (where ${interview.status} = 'analyzed')`.mapWith(Number),
    })
    .from(interview)
    .where(and(eq(interview.userId, userId), eq(interview.projectId, projectId)))

  const [specCounts] = await db
    .select({ total: count().mapWith(Number) })
    .from(featureSpec)
    .where(and(eq(featureSpec.userId, userId), eq(featureSpec.projectId, projectId)))

  return c.json({
    stats: {
      interviewCount: interviewCounts?.total ?? 0,
      specCount: specCounts?.total ?? 0,
      pendingInterviewCount: interviewCounts?.pendingCount ?? 0,
      analyzedInterviewCount: interviewCounts?.analyzedCount ?? 0,
    },
  })
})

app.put('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(db, projectId, userId)
  if (!found) return c.json({ error: 'Project not found' }, 404)

  const body = await c.req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : found.name
  const description = typeof body.description === 'string' ? body.description.trim() : found.description
  const status = typeof body.status === 'string' ? body.status.trim() : found.status

  if (!name) {
    return c.json({ error: 'Project name is required' }, 400)
  }

  const [updated] = await db
    .update(project)
    .set({
      name,
      description: description || null,
      status: status || 'active',
      updatedAt: new Date(),
    })
    .where(eq(project.id, projectId))
    .returning()

  return c.json({ project: updated })
})

app.delete('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(db, projectId, userId)
  if (!found) return c.json({ error: 'Project not found' }, 404)

  await db.delete(project).where(eq(project.id, projectId))

  return c.json({ success: true })
})

export default app
