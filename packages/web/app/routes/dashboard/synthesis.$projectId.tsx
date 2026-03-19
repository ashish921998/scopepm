import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

type ThemeItem = {
  name: string
  description: string
  frequency: number
  interviewIds: number[]
  relatedQuotes: string[]
}

type FrequencyItem = {
  point?: string
  request?: string
  frequency: number
  interviewIds: number[]
}

type Consensus = {
  agreements: string[]
  outliers: string[]
}

type SynthesisData = {
  id: number
  projectId: number
  themes: string | null
  painPoints: string | null
  featureRequests: string | null
  consensus: string | null
  aiSummary: string | null
  interviewCount: number
  status: string
  createdAt: string
  updatedAt: string
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const Route = createFileRoute('/dashboard/synthesis/$projectId')({
  component: SynthesisPage,
})

function SynthesisPage() {
  const { projectId } = Route.useParams()
  const [synthesis, setSynthesis] = useState<SynthesisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const loadSynthesis = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch<{ synthesis: SynthesisData | null }>(`/api/synthesis/${projectId}`)
      setSynthesis(res.synthesis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load synthesis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSynthesis()
  }, [projectId])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await apiFetch<{ synthesis: SynthesisData }>(`/api/synthesis/${projectId}/generate`, {
        method: 'POST',
      })
      setSynthesis(res.synthesis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate synthesis')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <div>
            <div className="skeleton" style={{ height: '40px', width: '320px', borderRadius: '8px', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ height: '18px', width: '240px' }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
      </div>
    )
  }

  if (!synthesis) {
    return (
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Cross-Interview Synthesis</h1>
            <p className="page-subtitle">Aggregate patterns and themes across all analyzed interviews.</p>
          </div>
          <div className="page-header-actions">
            <Link to="/dashboard/projects/$projectId" params={{ projectId }} className="btn-ghost">
              ← Back to project
            </Link>
          </div>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No synthesis yet</h3>
          <p>Generate a synthesis to discover patterns across your interviews. You need at least 2 analyzed interviews.</p>
          {error && <p style={{ color: 'var(--accent)', marginTop: '0.5rem' }}>{error}</p>}
          <button className="btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginTop: '1rem' }}>
            {generating ? 'Generating...' : 'Generate Synthesis'}
          </button>
        </div>
      </div>
    )
  }

  const parsedThemes = parseJson<ThemeItem[]>(synthesis.themes)
  const themes = Array.isArray(parsedThemes) ? parsedThemes : []
  const parsedPainPoints = parseJson<FrequencyItem[]>(synthesis.painPoints)
  const painPoints = Array.isArray(parsedPainPoints) ? parsedPainPoints : []
  const parsedFeatureRequests = parseJson<FrequencyItem[]>(synthesis.featureRequests)
  const featureRequests = Array.isArray(parsedFeatureRequests) ? parsedFeatureRequests : []
  const consensus = parseJson<Consensus>(synthesis.consensus)

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cross-Interview Synthesis</h1>
          <p className="page-subtitle">
            Patterns across {synthesis.interviewCount} interviews · Generated {new Date(synthesis.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/dashboard/projects/$projectId" params={{ projectId }} className="btn-ghost">
            ← Back to project
          </Link>
          <button className="btn-secondary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'var(--accent)', marginBottom: '1rem' }}>{error}</p>}

      {synthesis.aiSummary && (
        <div className="synthesis-summary-card">
          <h2 className="section-card-title">Summary</h2>
          <p className="synthesis-summary-text">{synthesis.aiSummary}</p>
        </div>
      )}

      <div className="dashboard-section-grid">
        {themes.length > 0 && (
          <section className="dashboard-section-card">
            <h2 className="section-card-title">Themes</h2>
            <p className="section-card-subtitle">Clustered themes ranked by frequency.</p>
            <div className="activity-list" style={{ marginTop: '1rem' }}>
              {themes.map((theme, i) => (
                <div key={i} className="synthesis-item">
                  <div className="synthesis-item-header">
                    <strong className="activity-title">{theme.name}</strong>
                    <span className="synthesis-frequency-badge">
                      {theme.frequency} of {synthesis.interviewCount}
                    </span>
                  </div>
                  <p className="synthesis-item-desc">{theme.description}</p>
                  <div className="synthesis-frequency-bar-track">
                    <div
                      className="synthesis-frequency-bar-fill"
                      style={{ width: `${synthesis.interviewCount ? (theme.frequency / synthesis.interviewCount) * 100 : 0}%` }}
                    />
                  </div>
                  {theme.relatedQuotes && theme.relatedQuotes.length > 0 && (
                    <div className="synthesis-quotes">
                      {theme.relatedQuotes.slice(0, 2).map((q, qi) => (
                        <p key={qi} className="synthesis-quote">"{q}"</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {painPoints.length > 0 && (
          <section className="dashboard-section-card">
            <h2 className="section-card-title">Pain Points</h2>
            <p className="section-card-subtitle">Issues ranked by how often they were mentioned.</p>
            <div className="activity-list" style={{ marginTop: '1rem' }}>
              {painPoints.map((pp, i) => (
                <div key={i} className="synthesis-item">
                  <div className="synthesis-item-header">
                    <span className="activity-title">{pp.point}</span>
                    <span className="synthesis-frequency-badge">
                      {pp.frequency} of {synthesis.interviewCount}
                    </span>
                  </div>
                  <div className="synthesis-frequency-bar-track">
                    <div
                      className="synthesis-frequency-bar-fill"
                      style={{ width: `${synthesis.interviewCount ? (pp.frequency / synthesis.interviewCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {featureRequests.length > 0 && (
          <section className="dashboard-section-card">
            <h2 className="section-card-title">Feature Requests</h2>
            <p className="section-card-subtitle">Requested features ranked by frequency.</p>
            <div className="activity-list" style={{ marginTop: '1rem' }}>
              {featureRequests.map((fr, i) => (
                <div key={i} className="synthesis-item">
                  <div className="synthesis-item-header">
                    <span className="activity-title">{fr.request}</span>
                    <span className="synthesis-frequency-badge">
                      {fr.frequency} of {synthesis.interviewCount}
                    </span>
                  </div>
                  <div className="synthesis-frequency-bar-track">
                    <div
                      className="synthesis-frequency-bar-fill"
                      style={{ width: `${synthesis.interviewCount ? (fr.frequency / synthesis.interviewCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {consensus && (
          <section className="dashboard-section-card">
            <h2 className="section-card-title">Consensus vs. Outliers</h2>
            <p className="section-card-subtitle">Areas of agreement and unique perspectives.</p>
            <div className="synthesis-consensus-grid">
              <div>
                <h3 className="synthesis-consensus-label">✓ Consensus</h3>
                <ul className="synthesis-consensus-list">
                  {(consensus.agreements || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="synthesis-consensus-label">◇ Outliers</h3>
                <ul className="synthesis-consensus-list">
                  {(consensus.outliers || []).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
