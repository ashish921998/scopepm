import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'

type Interview = {
  id: number
  projectId: number | null
  title: string
  summary: string | null
  insights: string | null
  status: string
  createdAt: string
}

type Project = {
  id: number
  name: string
}

export const Route = createFileRoute('/dashboard/interviews')({
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
  component: InterviewsPage,
})

function InterviewsPage() {
  const search = Route.useSearch()
  const initialProjectId = search.projectId
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(Boolean(search.new))
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [projectId, setProjectId] = useState<string>(initialProjectId ? String(initialProjectId) : '')
  const [analyzing, setAnalyzing] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setShowForm(Boolean(search.new))
    setProjectId(initialProjectId ? String(initialProjectId) : '')
  }, [search.new, initialProjectId])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectData, interviewData] = await Promise.all([
          apiFetch<{ projects: Project[] }>('/api/projects'),
          apiFetch<{ interviews: Interview[] }>(initialProjectId ? `/api/interviews?projectId=${initialProjectId}` : '/api/interviews'),
        ])

        setProjects(projectData.projects)
        setInterviews(interviewData.interviews)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load interviews')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [initialProjectId])

  const projectNameMap = useMemo(
    () => new Map(projects.map((item) => [item.id, item.name])),
    [projects],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const data = await apiFetch<{ interview: Interview }>('/api/interviews', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(projectId),
          title,
          transcript,
        }),
      })

      setInterviews((current) => [data.interview, ...current])
      setShowForm(false)
      setTitle('')
      setTranscript('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create interview')
      setSaving(false)
      return
    }

    setSaving(false)
  }

  const handleAnalyze = async (id: number) => {
    setAnalyzing(id)
    setError('')

    try {
      const data = await apiFetch<{ interview: Interview }>(`/api/interviews/${id}/analyze`, {
        method: 'POST',
      })
      setInterviews((current) => current.map((item) => item.id === id ? data.interview : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze interview')
    } finally {
      setAnalyzing(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this interview?')) return

    try {
      await apiFetch(`/api/interviews/${id}`, { method: 'DELETE' })
      setInterviews((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete interview')
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Interviews</h1>
          <p className="page-subtitle">
            {initialProjectId
              ? `Customer interviews for ${projectNameMap.get(initialProjectId) || 'this project'}`
              : 'Upload and analyze customer interview transcripts'}
          </p>
        </div>
        <button onClick={() => setShowForm((current) => !current)} className="btn-primary">
          {showForm ? 'Cancel' : 'New Interview'}
        </button>
      </div>

      {projects.length > 0 && (
        <div className="filter-row">
          <Link to="/dashboard/interviews" className={`filter-chip ${!initialProjectId ? 'is-active' : ''}`}>All projects</Link>
          {projects.map((item) => (
            <Link
              key={item.id}
              to="/dashboard/interviews"
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
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="form-input" required>
                <option value="">Select a project</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Interview title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="form-input"
                placeholder="Customer interview with Acme"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Transcript</label>
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                className="form-textarea"
                placeholder="Paste the interview transcript here..."
                rows={10}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving || projects.length === 0}>
              {saving ? 'Creating...' : 'Create Interview'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="loading-text">Loading interviews...</p>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>Create a project first</h3>
          <p>Projects keep discovery work organized. Once you have one, you can add interviews here.</p>
          <Link to="/dashboard/projects/new" className="btn-primary">Create Project</Link>
        </div>
      ) : interviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No interviews yet</h3>
          <p>Upload your first customer interview to get started with AI analysis.</p>
        </div>
      ) : (
        <div className="interview-list">
          {interviews.map((interview) => (
            <div key={interview.id} className="interview-card">
              <div className="interview-header">
                <div>
                  <h3 className="interview-title">{interview.title}</h3>
                  {interview.projectId && (
                    <Link
                      to="/dashboard/projects/$projectId"
                      params={{ projectId: String(interview.projectId) }}
                      className="entity-link"
                    >
                      {projectNameMap.get(interview.projectId) || 'Project'}
                    </Link>
                  )}
                </div>
                <span className={`status-badge status-${interview.status}`}>{interview.status}</span>
              </div>

              {interview.summary && <p className="interview-summary">{interview.summary}</p>}

              <div className="interview-meta">
                <span>{new Date(interview.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="interview-actions">
                {interview.status === 'pending' && (
                  <button
                    onClick={() => handleAnalyze(interview.id)}
                    className="btn-primary btn-sm"
                    disabled={analyzing === interview.id}
                  >
                    {analyzing === interview.id ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                )}
                {interview.status === 'analyzed' && interview.projectId && (
                  <Link
                    to="/dashboard/specs"
                    search={{ interviewId: interview.id, projectId: interview.projectId, new: true }}
                    className="btn-secondary btn-sm"
                  >
                    Generate Spec
                  </Link>
                )}
                <button onClick={() => handleDelete(interview.id)} className="btn-ghost btn-sm">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
