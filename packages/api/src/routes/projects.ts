import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { featureSpec, interview, project } from '../db/schema'
import { getUserId, parseInteger } from '../lib/utils'
import { AppEnv } from '../lib/hono'

const app = new Hono<AppEnv>()

async function getOwnedProject(projectId: number, userId: number) {
  const [found] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))

  return found ?? null
}

function enrichProjects(
  projects: Array<typeof project.$inferSelect>,
  interviews: Array<typeof interview.$inferSelect>,
  specs: Array<typeof featureSpec.$inferSelect>,
) {
  return projects.map((item) => ({
    ...item,
    interviewCount: interviews.filter((entry) => entry.projectId === item.id).length,
    specCount: specs.filter((entry) => entry.projectId === item.id).length,
    pendingInterviewCount: interviews.filter((entry) => entry.projectId === item.id && entry.status === 'pending').length,
  }))
}

app.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const projects = await db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt))

  const interviews = await db
    .select()
    .from(interview)
    .where(eq(interview.userId, userId))

  const specs = await db
    .select()
    .from(featureSpec)
    .where(eq(featureSpec.userId, userId))

  return c.json({
    projects: enrichProjects(projects, interviews, specs),
  })
})

app.get('/overview', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const projects = await db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt))

  const interviews = await db
    .select()
    .from(interview)
    .where(eq(interview.userId, userId))
    .orderBy(desc(interview.createdAt))

  const specs = await db
    .select()
    .from(featureSpec)
    .where(eq(featureSpec.userId, userId))
    .orderBy(desc(featureSpec.createdAt))

  const projectsWithCounts = enrichProjects(projects, interviews, specs)
  const projectNameMap = new Map(projects.map((item) => [item.id, item.name]))

  const recentActivity = [
    ...interviews.map((item) => ({
      id: item.id,
      type: 'interview',
      title: item.title,
      status: item.status,
      projectId: item.projectId,
      projectName: item.projectId ? projectNameMap.get(item.projectId) ?? null : null,
      createdAt: item.createdAt,
    })),
    ...specs.map((item) => ({
      id: item.id,
      type: 'spec',
      title: item.title,
      status: item.status,
      projectId: item.projectId,
      projectName: item.projectId ? projectNameMap.get(item.projectId) ?? null : null,
      createdAt: item.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return c.json({
    stats: {
      projectCount: projects.length,
      interviewCount: interviews.length,
      specCount: specs.length,
      pendingInterviewCount: interviews.filter((item) => item.status === 'pending').length,
    },
    recentActivity,
    projects: projectsWithCounts.slice(0, 6),
  })
})

app.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

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

  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(projectId, userId)
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

  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(projectId, userId)
  if (!found) return c.json({ error: 'Project not found' }, 404)

  const interviews = await db
    .select()
    .from(interview)
    .where(and(eq(interview.userId, userId), eq(interview.projectId, projectId)))

  const specs = await db
    .select()
    .from(featureSpec)
    .where(and(eq(featureSpec.userId, userId), eq(featureSpec.projectId, projectId)))

  return c.json({
    stats: {
      interviewCount: interviews.length,
      specCount: specs.length,
      pendingInterviewCount: interviews.filter((item) => item.status === 'pending').length,
      analyzedInterviewCount: interviews.filter((item) => item.status === 'analyzed').length,
    },
  })
})

app.put('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(projectId, userId)
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

  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('id'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  const found = await getOwnedProject(projectId, userId)
  if (!found) return c.json({ error: 'Project not found' }, 404)

  await db.delete(project).where(eq(project.id, projectId))

  return c.json({ success: true })
})

export default app
