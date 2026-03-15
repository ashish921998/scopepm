import { Hono } from 'hono'
import { featureSpec, interview, project } from '../db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getAnthropicClient, generateFeatureSpec } from '../lib/anthropic'
import { getString, getStringArray, getUserId, parseInteger, parseJsonFromText } from '../lib/utils'
import { AppEnv } from '../lib/hono'

const app = new Hono<AppEnv>()

// List all feature specs for current user
app.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projectId = parseInteger(c.req.query('projectId'))

  if (c.req.query('projectId') && !projectId) {
    return c.json({ error: 'Invalid project ID' }, 400)
  }

  if (projectId) {
    const [foundProject] = await db
      .select()
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.userId, userId)))

    if (!foundProject) {
      return c.json({ error: 'Project not found' }, 404)
    }
  }

  const specs = await db
    .select()
    .from(featureSpec)
    .where(projectId
      ? and(eq(featureSpec.userId, userId), eq(featureSpec.projectId, projectId))
      : eq(featureSpec.userId, userId))
    .orderBy(desc(featureSpec.createdAt))

  return c.json({ specs })
})

// Get single feature spec
app.get('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid feature spec ID' }, 400)
  
  const [found] = await db
    .select()
    .from(featureSpec)
    .where(eq(featureSpec.id, id))

  if (!found) {
    return c.json({ error: 'Feature spec not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  return c.json({ spec: found })
})

// Create new feature spec manually
app.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const body = await c.req.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const acceptanceCriteria = Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria : []
  const priority = typeof body.priority === 'string' ? body.priority : 'medium'
  const interviewId = typeof body.interviewId === 'number' ? body.interviewId : parseInteger(String(body.interviewId ?? ''))
  const projectId = typeof body.projectId === 'number' ? body.projectId : parseInteger(String(body.projectId ?? ''))

  if (!title || !description || !projectId) {
    return c.json({ error: 'Project, title, and description are required' }, 400)
  }

  const [foundProject] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))

  if (!foundProject) {
    return c.json({ error: 'Project not found' }, 404)
  }

  if (interviewId) {
    const [foundInterview] = await db
      .select()
      .from(interview)
      .where(eq(interview.id, interviewId))

    if (!foundInterview || foundInterview.userId !== userId) {
      return c.json({ error: 'Interview not found' }, 404)
    }
  }

  const [created] = await db
    .insert(featureSpec)
    .values({
      userId,
      projectId,
      title,
      description,
      acceptanceCriteria: acceptanceCriteria ? JSON.stringify(acceptanceCriteria) : null,
      priority: priority || 'medium',
      status: 'draft',
      interviewId: interviewId || null,
    })
    .returning()

  return c.json({ spec: created }, 201)
})

// Generate feature spec from interview insights
app.post('/generate', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const body = await c.req.json()
  const sourceInterviewId = typeof body.interviewId === 'number'
    ? body.interviewId
    : parseInteger(String(body.interviewId ?? ''))
  const context = getString(body.context) || undefined

  if (!sourceInterviewId) {
    return c.json({ error: 'Interview ID is required' }, 400)
  }

  const [found] = await db
    .select()
    .from(interview)
    .where(eq(interview.id, sourceInterviewId))

  if (!found) {
    return c.json({ error: 'Interview not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  if (!found.insights) {
    return c.json({ error: 'Interview must be analyzed first' }, 400)
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return c.json({ error: 'Anthropic API key not configured' }, 500)
    }

    const client = getAnthropicClient(apiKey)
    const specText = await generateFeatureSpec(client, found.insights, context)
    const specData = parseJsonFromText(specText)

    const [created] = await db
      .insert(featureSpec)
      .values({
        userId,
        projectId: found.projectId,
        interviewId: sourceInterviewId,
        title: getString(specData.title, 'Untitled Feature'),
        description: getString(specData.description),
        acceptanceCriteria: JSON.stringify(getStringArray(specData.acceptanceCriteria)),
        priority: getString(specData.priority, 'medium'),
        status: 'draft',
      })
      .returning()

    return c.json({ spec: created, generated: specData }, 201)
  } catch (error) {
    console.error('Spec generation error:', error)
    return c.json({ error: 'Failed to generate feature spec' }, 500)
  }
})

// Update feature spec
app.put('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid feature spec ID' }, 400)
  const body = await c.req.json()
  
  const [found] = await db
    .select()
    .from(featureSpec)
    .where(eq(featureSpec.id, id))

  if (!found) {
    return c.json({ error: 'Feature spec not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const nextProjectId = body.projectId === undefined
    ? found.projectId
    : typeof body.projectId === 'number'
      ? body.projectId
      : parseInteger(String(body.projectId ?? ''))

  if (nextProjectId) {
    const [foundProject] = await db
      .select()
      .from(project)
      .where(and(eq(project.id, nextProjectId), eq(project.userId, userId)))

    if (!foundProject) {
      return c.json({ error: 'Project not found' }, 404)
    }
  }

  const [updated] = await db
    .update(featureSpec)
    .set({
      // Explicit whitelist — never spread raw body to prevent overwriting protected fields
      title: body.title !== undefined ? String(body.title) : found.title,
      description: body.description !== undefined ? String(body.description) : found.description,
      priority: body.priority !== undefined ? String(body.priority) : found.priority,
      status: body.status !== undefined ? String(body.status) : found.status,
      acceptanceCriteria: body.acceptanceCriteria ? JSON.stringify(body.acceptanceCriteria) : found.acceptanceCriteria,
      projectId: nextProjectId,
      updatedAt: new Date(),
    })
    .where(eq(featureSpec.id, id))
    .returning()

  return c.json({ spec: updated })
})

// Delete feature spec
app.delete('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid feature spec ID' }, 400)
  
  const [found] = await db
    .select()
    .from(featureSpec)
    .where(eq(featureSpec.id, id))

  if (!found) {
    return c.json({ error: 'Feature spec not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  await db.delete(featureSpec).where(eq(featureSpec.id, id))

  return c.json({ success: true })
})

export default app
