import { Hono } from 'hono'
import { db } from '../db'
import { interview, project } from '../db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getAnthropicClient, analyzeInterview } from '../lib/anthropic'
import { getString, getStringArray, getUserId, parseInteger, parseJsonFromText } from '../lib/utils'
import { AppEnv } from '../lib/hono'

const app = new Hono<AppEnv>()

// List all interviews for current user
app.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

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

  const interviews = await db
    .select()
    .from(interview)
    .where(projectId
      ? and(eq(interview.userId, userId), eq(interview.projectId, projectId))
      : eq(interview.userId, userId))
    .orderBy(desc(interview.createdAt))

  return c.json({ interviews })
})

// Get single interview
app.get('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid interview ID' }, 400)
  
  const [found] = await db
    .select()
    .from(interview)
    .where(eq(interview.id, id))

  if (!found) {
    return c.json({ error: 'Interview not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  return c.json({ interview: found })
})

// Create new interview
app.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const body = await c.req.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
  const projectId = typeof body.projectId === 'number' ? body.projectId : parseInteger(String(body.projectId ?? ''))

  if (!title || !transcript || !projectId) {
    return c.json({ error: 'Project, title, and transcript are required' }, 400)
  }

  const [foundProject] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))

  if (!foundProject) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const [created] = await db
    .insert(interview)
    .values({
      userId,
      projectId,
      title,
      transcript,
      status: 'pending',
    })
    .returning()

  return c.json({ interview: created }, 201)
})

// Analyze interview with AI
app.post('/:id/analyze', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid interview ID' }, 400)
  
  const [found] = await db
    .select()
    .from(interview)
    .where(eq(interview.id, id))

  if (!found) {
    return c.json({ error: 'Interview not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    const apiKey = c.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return c.json({ error: 'Anthropic API key not configured' }, 500)
    }

    const client = getAnthropicClient(apiKey)
    const analysisText = await analyzeInterview(client, found.transcript)
    const analysis = parseJsonFromText(analysisText)

    const [updated] = await db
      .update(interview)
      .set({
        summary: getString(analysis.summary) || null,
        insights: JSON.stringify({
          painPoints: getStringArray(analysis.painPoints),
          featureRequests: getStringArray(analysis.featureRequests),
          userGoals: getStringArray(analysis.userGoals),
          notableQuotes: getStringArray(analysis.notableQuotes),
          insights: getStringArray(analysis.insights),
          recommendations: getStringArray(analysis.recommendations),
        }),
        status: 'analyzed',
        updatedAt: new Date(),
      })
      .where(eq(interview.id, id))
      .returning()

    return c.json({ interview: updated, analysis })
  } catch (error) {
    console.error('Analysis error:', error)
    return c.json({ error: 'Failed to analyze interview' }, 500)
  }
})

// Delete interview
app.delete('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid interview ID' }, 400)
  
  const [found] = await db
    .select()
    .from(interview)
    .where(eq(interview.id, id))

  if (!found) {
    return c.json({ error: 'Interview not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  await db.delete(interview).where(eq(interview.id, id))

  return c.json({ success: true })
})

export default app
