import { Hono } from 'hono'
import { synthesis, interview, project } from '../db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getAnthropicClient, MAX_SYNTHESIS_INTERVIEWS, synthesizeInterviews } from '../lib/anthropic'
import { getUserId, parseInteger, parseJsonFromText } from '../lib/utils'
import { AppEnv } from '../lib/hono'
import { logger } from '../lib/logger'

// --- Normalization helpers for LLM output ---

type NormalizedTheme = {
  name: string
  description: string
  frequency: number
  interviewIds: number[]
  relatedQuotes: string[]
}

type NormalizedFrequencyItem = {
  point?: string
  request?: string
  frequency: number
  interviewIds: number[]
}

type NormalizedConsensus = {
  agreements: string[]
  outliers: string[]
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  return fallback
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function normalizeThemes(raw: unknown): NormalizedTheme[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && typeof (item as Record<string, unknown>).name === 'string'
    )
    .map((item) => ({
      name: String(item.name).trim(),
      description: typeof item.description === 'string' ? item.description.trim() : '',
      frequency: toFiniteNumber(item.frequency, 0),
      interviewIds: toNumberArray(item.interviewIds),
      relatedQuotes: toStringArray(item.relatedQuotes),
    }))
    .filter((t) => t.name.length > 0)
}

function normalizeFrequencyItems(raw: unknown, labelKey: 'point' | 'request'): NormalizedFrequencyItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && typeof (item as Record<string, unknown>)[labelKey] === 'string'
    )
    .map((item) => ({
      [labelKey]: String(item[labelKey]).trim(),
      frequency: toFiniteNumber(item.frequency, 0),
      interviewIds: toNumberArray(item.interviewIds),
    }))
    .filter((f) => {
      const label = f[labelKey]
      return typeof label === 'string' && label.length > 0
    })
}

function normalizeConsensus(raw: unknown): NormalizedConsensus {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { agreements: [], outliers: [] }
  }
  const obj = raw as Record<string, unknown>
  return {
    agreements: toStringArray(obj.agreements),
    outliers: toStringArray(obj.outliers),
  }
}

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
    .orderBy(desc(interview.createdAt))

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

    // Store the count actually sent to the AI, not total analyzed
    const synthesizedCount = Math.min(interviews.length, MAX_SYNTHESIS_INTERVIEWS)
    const synthesisText = await synthesizeInterviews(client, interviewInsights)
    const parsed = parseJsonFromText(synthesisText)

    const themes = normalizeThemes(parsed.themes)
    const painPoints = normalizeFrequencyItems(parsed.painPoints, 'point')
    const featureRequests = normalizeFrequencyItems(parsed.featureRequests, 'request')
    const consensus = normalizeConsensus(parsed.consensus)
    const summary = typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : null

    const hasUsableData = themes.length > 0 || painPoints.length > 0 || featureRequests.length > 0 || summary

    if (!hasUsableData) {
      // Upsert as failed and clear stale data so the UI doesn't show outdated results
      const failedValues = {
        status: 'failed' as const,
        interviewCount: synthesizedCount,
        themes: null,
        painPoints: null,
        featureRequests: null,
        consensus: null,
        aiSummary: null,
        updatedAt: new Date(),
      }
      await db
        .insert(synthesis)
        .values({ userId, projectId, ...failedValues })
        .onConflictDoUpdate({
          target: [synthesis.userId, synthesis.projectId],
          set: failedValues,
        })

      return c.json({ error: 'Synthesis produced no usable data — please try again' }, 422)
    }

    const synthesisValues = {
      themes: JSON.stringify(themes),
      painPoints: JSON.stringify(painPoints),
      featureRequests: JSON.stringify(featureRequests),
      consensus: JSON.stringify(consensus),
      aiSummary: summary,
      interviewCount: synthesizedCount,
      status: 'completed' as const,
      updatedAt: new Date(),
    }

    const [created] = await db
      .insert(synthesis)
      .values({ userId, projectId, ...synthesisValues })
      .onConflictDoUpdate({
        target: [synthesis.userId, synthesis.projectId],
        set: synthesisValues,
      })
      .returning()

    return c.json({ synthesis: created })
  } catch (error) {
    logger.error('Synthesis generation failed', error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) })
    return c.json({ error: 'Failed to generate synthesis' }, 500)
  }
})

export default app
