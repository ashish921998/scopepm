import { Hono } from 'hono'
import { competitor, project } from '../db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getAnthropicClient, analyzeCompetitor } from '../lib/anthropic'
import { extractTextFromHtml } from '../lib/html'
import { getString, getStringArray, getUserId, isPrivateHostname, parseInteger, parseJsonFromText } from '../lib/utils'
import { AppEnv } from '../lib/hono'
import { logger } from '../lib/logger'

const app = new Hono<AppEnv>()

// List competitors, optional ?projectId= filter
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

  const competitors = await db
    .select()
    .from(competitor)
    .where(projectId
      ? and(eq(competitor.userId, userId), eq(competitor.projectId, projectId))
      : eq(competitor.userId, userId))
    .orderBy(desc(competitor.createdAt))

  return c.json({ competitors })
})

// Get single competitor
app.get('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid competitor ID' }, 400)

  const [found] = await db
    .select()
    .from(competitor)
    .where(eq(competitor.id, id))

  if (!found) {
    return c.json({ error: 'Competitor not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  return c.json({ competitor: found })
})

// Create competitor
app.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const body = await c.req.json()
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const projectId = typeof body.projectId === 'number' ? body.projectId : parseInteger(String(body.projectId ?? ''))

  if (!url || !projectId) {
    return c.json({ error: 'URL and project are required' }, 400)
  }

  if (!/^https?:\/\//i.test(url)) {
    return c.json({ error: 'URL must start with http:// or https://' }, 400)
  }

  try {
    const parsed = new URL(url)
    if (isPrivateHostname(parsed.hostname)) {
      return c.json({ error: 'URL points to a private or reserved address' }, 400)
    }
  } catch {
    return c.json({ error: 'Invalid URL' }, 400)
  }

  const [foundProject] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))

  if (!foundProject) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const [created] = await db
    .insert(competitor)
    .values({
      userId,
      projectId,
      url,
      status: 'pending',
    })
    .returning()

  return c.json({ competitor: created }, 201)
})

// Analyze competitor with AI
app.post('/:id/analyze', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid competitor ID' }, 400)

  const [found] = await db
    .select()
    .from(competitor)
    .where(eq(competitor.id, id))

  if (!found) {
    return c.json({ error: 'Competitor not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    // Fetch the competitor's website
    let html: string
    try {
      const response = await fetch(found.url, {
        headers: { 'User-Agent': 'ScopePM/1.0 (competitor analysis)' },
        redirect: 'follow',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const finalHostname = new URL(response.url).hostname
      if (isPrivateHostname(finalHostname)) {
        throw new Error('Redirect to private address')
      }
      html = await response.text()
    } catch (fetchError) {
      await db
        .update(competitor)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(competitor.id, id))

      return c.json({ error: 'Failed to fetch competitor website' }, 422)
    }

    const websiteText = extractTextFromHtml(html)

    if (websiteText.length < 50) {
      await db
        .update(competitor)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(competitor.id, id))

      return c.json({ error: 'Website returned insufficient content' }, 422)
    }

    const apiKey = c.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return c.json({ error: 'Anthropic API key not configured' }, 500)
    }

    const client = getAnthropicClient(apiKey)
    const analysisText = await analyzeCompetitor(client, websiteText)
    const analysis = parseJsonFromText(analysisText)

    const [updated] = await db
      .update(competitor)
      .set({
        name: getString(analysis.name) || null,
        description: getString(analysis.description) || null,
        features: JSON.stringify(getStringArray(analysis.features)),
        pricing: getString(analysis.pricing) || null,
        positioning: getString(analysis.positioning) || null,
        status: 'analyzed',
        updatedAt: new Date(),
      })
      .where(eq(competitor.id, id))
      .returning()

    return c.json({ competitor: updated, analysis })
  } catch (error) {
    logger.error('Competitor analysis failed', error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) })
    return c.json({ error: 'Failed to analyze competitor' }, 500)
  }
})

// Update competitor (manual edits)
app.put('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid competitor ID' }, 400)

  const [found] = await db
    .select()
    .from(competitor)
    .where(eq(competitor.id, id))

  if (!found) {
    return c.json({ error: 'Competitor not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()

  const [updated] = await db
    .update(competitor)
    .set({
      name: typeof body.name === 'string' ? body.name.trim() || null : found.name,
      description: typeof body.description === 'string' ? body.description.trim() || null : found.description,
      features: typeof body.features === 'string' ? body.features : found.features,
      pricing: typeof body.pricing === 'string' ? body.pricing.trim() || null : found.pricing,
      positioning: typeof body.positioning === 'string' ? body.positioning.trim() || null : found.positioning,
      updatedAt: new Date(),
    })
    .where(eq(competitor.id, id))
    .returning()

  return c.json({ competitor: updated })
})

// Delete competitor
app.delete('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const userId = getUserId(user)
  const id = parseInteger(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid competitor ID' }, 400)

  const [found] = await db
    .select()
    .from(competitor)
    .where(eq(competitor.id, id))

  if (!found) {
    return c.json({ error: 'Competitor not found' }, 404)
  }

  if (found.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  await db.delete(competitor).where(eq(competitor.id, id))

  return c.json({ success: true })
})

export default app
