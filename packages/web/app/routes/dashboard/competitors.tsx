import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { SkeletonInterviewCard } from '../../components/Skeleton'

type Competitor = {
  id: number
  projectId: number | null
  url: string
  name: string | null
  description: string | null
  features: string | null
  pricing: string | null
  positioning: string | null
  status: string
  createdAt: string
}

type Project = {
  id: number
  name: string
}

function parseFeatures(features: string | null): string[] {
  if (!features) return []
  try {
    const parsed = JSON.parse(features)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const Route = createFileRoute('/dashboard/competitors')({
  validateSearch: (search: Record<string, unknown>): { projectId?: number; new?: boolean } => {
    const nextProjectId = typeof search.projectId === 'string'
      ? Number(search.projectId)
      : typeof search.projectId === 'number'
        ? search.projectId
        : undefined

    return {
      projectId: Number.isFinite(nextProjectId) ? nextProjectId : undefined,
      new: search.new === true || search.new === 'true' ? true : undefined,
    }
  },
  component: CompetitorsPage,
})

function CompetitorsPage() {
  const search = Route.useSearch()
  const initialProjectId = search.projectId
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(Boolean(search.new))
  const [url, setUrl] = useState('')
  const [projectId, setProjectId] = useState<string>(initialProjectId ? String(initialProjectId) : '')
  const [analyzing, setAnalyzing] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [urlError, setUrlError] = useState('')
  const [projectIdError, setProjectIdError] = useState('')
  const [formError, setFormError] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFeatures, setEditFeatures] = useState('')
  const [editPricing, setEditPricing] = useState('')
  const [editPositioning, setEditPositioning] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    setShowForm(Boolean(search.new))
    setProjectId(initialProjectId ? String(initialProjectId) : '')
  }, [search.new, initialProjectId])

  useEffect(() => {
    let isCurrent = true
    const loadData = async () => {
      setLoading(true)
      setError('')
      try {
        const [projectData, competitorData] = await Promise.all([
          apiFetch<{ projects: Project[] }>('/api/projects'),
          apiFetch<{ competitors: Competitor[] }>(initialProjectId ? `/api/competitors?projectId=${initialProjectId}` : '/api/competitors'),
        ])
        if (!isCurrent) return
        setProjects(projectData.projects)
        setCompetitors(competitorData.competitors)
      } catch (err) {
        if (!isCurrent) return
        setError(err instanceof Error ? err.message : 'Failed to load competitors')
      } finally {
        if (isCurrent) setLoading(false)
      }
    }
    void loadData()
    return () => { isCurrent = false }
  }, [initialProjectId])

  const projectNameMap = useMemo(
    () => new Map(projects.map((item) => [item.id, item.name])),
    [projects],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setUrlError('')
    setProjectIdError('')
    setFormError('')

    let valid = true

    if (!projectId) {
      setProjectIdError('Please select a project')
      valid = false
    }

    if (!url.trim()) {
      setUrlError('URL is required')
      valid = false
    } else if (!/^https?:\/\//i.test(url.trim())) {
      setUrlError('URL must start with http:// or https://')
      valid = false
    }

    if (!valid) return

    setSaving(true)

    try {
      const data = await apiFetch<{ competitor: Competitor }>('/api/competitors', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(projectId),
          url: url.trim(),
        }),
      })

      if (!initialProjectId || data.competitor.projectId === initialProjectId) {
        setCompetitors((current) => [data.competitor, ...current])
      }
      setShowForm(false)
      setUrl('')
      setProjectId(initialProjectId ? String(initialProjectId) : '')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add competitor')
      setSaving(false)
      return
    }

    setSaving(false)
  }

  const handleAnalyze = async (id: number) => {
    setAnalyzing(id)
    setError('')

    try {
      const data = await apiFetch<{ competitor: Competitor }>(`/api/competitors/${id}/analyze`, {
        method: 'POST',
      })
      setCompetitors((current) => current.map((item) => item.id === id ? data.competitor : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze competitor')
    } finally {
      setAnalyzing(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return

    try {
      await apiFetch(`/api/competitors/${id}`, { method: 'DELETE' })
      setCompetitors((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete competitor')
    }
  }

  const handleEditStart = (item: Competitor) => {
    setEditingId(item.id)
    setEditName(item.name || '')
    setEditDescription(item.description || '')
    setEditFeatures(parseFeatures(item.features).join(', '))
    setEditPricing(item.pricing || '')
    setEditPositioning(item.positioning || '')
    setEditError('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
    setEditFeatures('')
    setEditPricing('')
    setEditPositioning('')
    setEditError('')
  }

  const handleEditSubmit = async (id: number, event: React.FormEvent) => {
    event.preventDefault()
    setEditSaving(true)
    setEditError('')

    try {
      const featuresArray = editFeatures.split(',').map((f) => f.trim()).filter(Boolean)
      const data = await apiFetch<{ competitor: Competitor }>(`/api/competitors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          features: JSON.stringify(featuresArray),
          pricing: editPricing.trim(),
          positioning: editPositioning.trim(),
        }),
      })
      setCompetitors((current) =>
        current.map((item) => (item.id === id ? data.competitor : item)),
      )
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update competitor')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Competitors</h1>
          <p className="page-subtitle">
            {initialProjectId
              ? `Market landscape for ${projectNameMap.get(initialProjectId) || 'this project'}`
              : 'Track competitors and analyze their positioning'}
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => setShowForm((current) => !current)} className="btn-primary">
            {showForm ? 'Cancel' : 'Add Competitor'}
          </button>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="filter-row">
          <Link to="/dashboard/competitors" className={`filter-chip ${!initialProjectId ? 'is-active' : ''}`}>All projects</Link>
          {projects.map((item) => (
            <Link
              key={item.id}
              to="/dashboard/competitors"
              search={{ projectId: item.id }}
              className={`filter-chip ${initialProjectId === item.id ? 'is-active' : ''}`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}

      {error && <div className="auth-error page-alert">{error}</div>}

      {showForm && (
        <div className="form-card">
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label className="form-label">Project</label>
              <select
                value={projectId}
                onChange={(event) => { setProjectId(event.target.value); if (projectIdError) setProjectIdError('') }}
                className={`form-input${projectIdError ? ' form-input--error' : ''}`}
              >
                <option value="">Select a project</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {projectIdError && <span className="field-error">{projectIdError}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Competitor URL</label>
              <input
                type="url"
                value={url}
                onChange={(event) => { setUrl(event.target.value); if (urlError) setUrlError('') }}
                className={`form-input${urlError ? ' form-input--error' : ''}`}
                placeholder="https://competitor.com"
              />
              {urlError && <span className="field-error">{urlError}</span>}
            </div>
            {formError && <div className="auth-error page-alert">{formError}</div>}
            <button type="submit" className="btn-primary" disabled={saving || projects.length === 0}>
              {saving ? 'Adding...' : 'Add Competitor'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="competitor-list">
          {[...Array(3)].map((_, i) => (
            <SkeletonInterviewCard key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>Create a project first</h3>
          <p>Projects keep discovery work organized. Once you have one, you can track competitors here.</p>
          <Link to="/dashboard/projects/new" className="btn-primary">Create Project</Link>
        </div>
      ) : competitors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>No competitors yet</h3>
          <p>Add a competitor URL and let AI extract their profile automatically.</p>
        </div>
      ) : (
        <div className="competitor-list">
          {competitors.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="competitor-card">
                <form onSubmit={(e) => handleEditSubmit(item.id, e)} className="auth-form">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="form-input" placeholder="Company name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="form-textarea" placeholder="What they do..." rows={3} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Features (comma-separated)</label>
                    <input type="text" value={editFeatures} onChange={(e) => setEditFeatures(e.target.value)} className="form-input" placeholder="feature 1, feature 2, feature 3" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pricing</label>
                    <input type="text" value={editPricing} onChange={(e) => setEditPricing(e.target.value)} className="form-input" placeholder="Free tier, Pro at $X/mo..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Positioning</label>
                    <textarea value={editPositioning} onChange={(e) => setEditPositioning(e.target.value)} className="form-textarea" placeholder="Who they target and how they differentiate..." rows={2} />
                  </div>
                  {editError && <div className="auth-error page-alert">{editError}</div>}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn-primary btn-sm" disabled={editSaving}>
                      {editSaving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={handleEditCancel} disabled={editSaving}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div key={item.id} className="competitor-card">
                <div className="competitor-header">
                  <div>
                    <h3 className="competitor-name">{item.name || item.url}</h3>
                    {item.name && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="competitor-url">
                        {item.url}
                      </a>
                    )}
                    {item.projectId && (
                      <Link
                        to="/dashboard/projects/$projectId"
                        params={{ projectId: String(item.projectId) }}
                        className="entity-link"
                        style={{ marginLeft: item.name ? '0.75rem' : 0 }}
                      >
                        {projectNameMap.get(item.projectId) || 'Project'}
                      </Link>
                    )}
                  </div>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>

                {item.description && <p className="competitor-description">{item.description}</p>}

                {item.status === 'analyzed' && (() => {
                  const parsedFeatures = parseFeatures(item.features)
                  return <>
                    {parsedFeatures.length > 0 && (
                      <div className="competitor-section">
                        <h4 className="competitor-section-title">Features</h4>
                        <div className="feature-tags">
                          {parsedFeatures.map((feature, i) => (
                            <span key={i} className="feature-tag">{feature}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.pricing && (
                      <div className="competitor-section">
                        <h4 className="competitor-section-title">Pricing</h4>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0 }}>{item.pricing}</p>
                      </div>
                    )}

                    {item.positioning && (
                      <div className="competitor-section">
                        <h4 className="competitor-section-title">Positioning</h4>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0 }}>{item.positioning}</p>
                      </div>
                    )}
                  </>
                })()}

                <div className="competitor-actions">
                  {(item.status === 'pending' || item.status === 'failed') && (
                    <button
                      onClick={() => handleAnalyze(item.id)}
                      className="btn-primary btn-sm"
                      disabled={analyzing === item.id}
                    >
                      {analyzing === item.id ? 'Analyzing...' : 'Analyze with AI'}
                    </button>
                  )}
                  <button onClick={() => handleEditStart(item)} className="btn-secondary btn-sm">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="btn-ghost btn-sm">
                    Delete
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
