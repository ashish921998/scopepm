import { Hono } from 'hono'
import { competitor, project } from '../db/schema'
import { and, desc, eq, inArray } from 'drizzle-orm'
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

  const body = await c.req.json().catch(() => ({}))
  const rerun = body && typeof body === 'object' && 'rerun' in body && body.rerun === true

  // If already analyzed and not a rerun, return the existing competitor
  if (found.status === 'analyzed' && !rerun) {
    return c.json({ competitor: found })
  }

  // Atomic compare-and-set: only proceed if row is in a startable state
  const allowedStatuses = rerun ? ['pending', 'failed', 'analyzed'] : ['pending', 'failed']
  const [locked] = await db
    .update(competitor)
    .set({ status: 'analyzing', updatedAt: new Date() })
    .where(and(eq(competitor.id, id), inArray(competitor.status, allowedStatuses)))
    .returning()

  if (!locked) {
    return c.json({ error: 'Analysis already in progress' }, 409)
  }

  try {
    // Fetch the competitor's website
    const MAX_BODY_BYTES = 5 * 1024 * 1024 // 5 MB
    let html: string
    try {
      const maxRedirects = 5
      let currentUrl = found.url
      let response: Response | undefined
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30_000)
      try {
        for (let i = 0; i <= maxRedirects; i++) {
          const targetHostname = new URL(currentUrl).hostname
          if (isPrivateHostname(targetHostname)) {
            throw new Error('Redirect to private address')
          }
          response = await fetch(currentUrl, {
            headers: { 'User-Agent': 'ScopePM/1.0 (competitor analysis)' },
            redirect: 'manual',
            signal: controller.signal,
          })
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location')
            if (!location) break
            currentUrl = new URL(location, currentUrl).href
            continue
          }
          break
        }
        if (!response || !response.ok) {
          throw new Error(`HTTP ${response?.status ?? 'no response'}`)
        }

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('text/') && !contentType.includes('html')) {
          throw new Error('Response is not HTML/text')
        }

        const contentLength = response.headers.get('content-length')
        if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
          throw new Error('Response body too large')
        }

        html = await response.text()
        if (html.length > MAX_BODY_BYTES) {
          html = html.slice(0, MAX_BODY_BYTES)
        }
      } finally {
        clearTimeout(timeoutId)
      }
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

    const hasUsableAnalysis = Object.keys(analysis).length > 0 && (getString(analysis.name) || getString(analysis.description) || getStringArray(analysis.features).length > 0)

    if (!hasUsableAnalysis) {
      const [failed] = await db
        .update(competitor)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(competitor.id, id))
        .returning()

      return c.json({ competitor: failed, error: 'Analysis produced no usable data' }, 422)
    }

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
