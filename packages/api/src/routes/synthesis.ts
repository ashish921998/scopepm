import { Hono } from 'hono'
import { synthesis, interview, project } from '../db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getAnthropicClient, synthesizeInterviews } from '../lib/anthropic'
import { getUserId, parseInteger, parseJsonFromText } from '../lib/utils'
import { AppEnv } from '../lib/hono'
import { logger } from '../lib/logger'

const app = new Hono<AppEnv>()

// Get synthesis for a project
app.get('/:projectId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('projectId'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  // Verify project ownership
  const [foundProject] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))

  if (!foundProject) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const [found] = await db
    .select()
    .from(synthesis)
    .where(and(eq(synthesis.projectId, projectId), eq(synthesis.userId, userId)))
    .orderBy(desc(synthesis.createdAt))

  if (!found) {
    return c.json({ synthesis: null })
  }

  return c.json({ synthesis: found })
})

// Generate synthesis for a project
app.post('/:projectId/generate', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const projectId = parseInteger(c.req.param('projectId'))
  if (!projectId) return c.json({ error: 'Invalid project ID' }, 400)

  // Verify project ownership
  const [foundProject] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))

  if (!foundProject) {
    return c.json({ error: 'Project not found' }, 404)
  }

  // Fetch all analyzed interviews for this project
  const interviews = await db
    .select()
    .from(interview)
    .where(
      and(
        eq(interview.projectId, projectId),
        eq(interview.userId, userId),
        eq(interview.status, 'analyzed')
      )
    )

  if (interviews.length < 2) {
    return c.json({ error: 'At least 2 analyzed interviews are required for synthesis' }, 400)
  }

  try {
    const apiKey = c.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return c.json({ error: 'Anthropic API key not configured' }, 500)
    }

    const client = getAnthropicClient(apiKey)

    const interviewInsights = interviews.map((i) => ({
      id: i.id,
      title: i.title,
      insights: i.insights || '',
    }))

    const synthesisText = await synthesizeInterviews(client, interviewInsights)
    const parsed = parseJsonFromText(synthesisText)

    const themes = Array.isArray(parsed.themes) ? parsed.themes : []
    const painPoints = Array.isArray(parsed.painPoints) ? parsed.painPoints : []
    const featureRequests = Array.isArray(parsed.featureRequests) ? parsed.featureRequests : []
    const consensus = parsed.consensus && typeof parsed.consensus === 'object' && !Array.isArray(parsed.consensus)
      ? parsed.consensus
      : {}

    // Atomic replace: delete old + insert new in a transaction
    const [created] = await db.transaction(async (tx) => {
      await tx
        .delete(synthesis)
        .where(and(eq(synthesis.projectId, projectId), eq(synthesis.userId, userId)))

      return tx
        .insert(synthesis)
        .values({
          userId,
          projectId,
          themes: JSON.stringify(themes),
          painPoints: JSON.stringify(painPoints),
          featureRequests: JSON.stringify(featureRequests),
          consensus: JSON.stringify(consensus),
          aiSummary: typeof parsed.summary === 'string' ? parsed.summary : null,
          interviewCount: Math.min(interviews.length, 20),
          status: 'completed',
        })
        .returning()
    })

    return c.json({ synthesis: created })
  } catch (error) {
    logger.error('Synthesis generation failed', error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) })
    return c.json({ error: 'Failed to generate synthesis' }, 500)
  }
})

export default app
