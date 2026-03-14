import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { SkeletonInterviewCard } from '../../components/Skeleton'

type Interview = {
  id: number
  projectId: number | null
  title: string
  transcript: string
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

export function InterviewsPage() {
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

  // New interview form field errors
  const [projectIdError, setProjectIdError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [transcriptError, setTranscriptError] = useState('')
  const [formError, setFormError] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTranscript, setEditTranscript] = useState('')
  const [editTitleError, setEditTitleError] = useState('')
  const [editTranscriptError, setEditTranscriptError] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

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

    setProjectIdError('')
    setTitleError('')
    setTranscriptError('')
    setFormError('')

    let valid = true

    if (!projectId) {
      setProjectIdError('Please select a project')
      valid = false
    }

    if (!title.trim() || title.trim().length < 3) {
      setTitleError('Title must be at least 3 characters')
      valid = false
    }

    if (!transcript.trim() || transcript.trim().length < 50) {
      setTranscriptError('Transcript must be at least 50 characters')
      valid = false
    }

    if (!valid) return

    setSaving(true)

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
      setProjectId(initialProjectId ? String(initialProjectId) : '')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create interview')
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

  const handleEditStart = (item: Interview) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditTranscript(item.transcript)
    setEditTitleError('')
    setEditTranscriptError('')
    setEditError('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditTitle('')
    setEditTranscript('')
    setEditTitleError('')
    setEditTranscriptError('')
    setEditError('')
  }

  const handleEditSubmit = async (id: number, event: React.FormEvent) => {
    event.preventDefault()

    let valid = true
    setEditTitleError('')
    setEditTranscriptError('')
    setEditError('')

    if (!editTitle.trim() || editTitle.trim().length < 3) {
      setEditTitleError('Title must be at least 3 characters')
      valid = false
    }

    if (!editTranscript.trim() || editTranscript.trim().length < 50) {
      setEditTranscriptError('Transcript must be at least 50 characters')
      valid = false
    }

    if (!valid) return

    setEditSaving(true)

    try {
      const data = await apiFetch<{ interview: Interview }>(`/api/interviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitle.trim(), transcript: editTranscript.trim() }),
      })
      setInterviews((current) =>
        current.map((item) => (item.id === id ? data.interview : item)),
      )
      setEditingId(null)
      setEditTitle('')
      setEditTranscript('')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update interview')
    } finally {
      setEditSaving(false)
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
              <label className="form-label">Interview title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => { setTitle(event.target.value); if (titleError) setTitleError('') }}
                className={`form-input${titleError ? ' form-input--error' : ''}`}
                placeholder="Customer interview with Acme"
              />
              {titleError && <span className="field-error">{titleError}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Transcript</label>
              <textarea
                value={transcript}
                onChange={(event) => { setTranscript(event.target.value); if (transcriptError) setTranscriptError('') }}
                className={`form-textarea${transcriptError ? ' form-textarea--error' : ''}`}
                placeholder="Paste the interview transcript here..."
                rows={10}
              />
              {transcriptError && <span className="field-error">{transcriptError}</span>}
            </div>
            {formError && <div className="auth-error page-alert">{formError}</div>}
            <button type="submit" className="btn-primary" disabled={saving || projects.length === 0}>
              {saving ? 'Creating...' : 'Create Interview'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="interview-list">
          {[...Array(3)].map((_, i) => (
            <SkeletonInterviewCard key={i} />
          ))}
        </div>
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
          {interviews.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="interview-card">
                <form onSubmit={(e) => handleEditSubmit(item.id, e)} className="auth-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor={`edit-title-${item.id}`}>
                      Interview title
                    </label>
                    <input
                      id={`edit-title-${item.id}`}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="form-input"
                      placeholder="Customer interview with Acme"
                    />
                    {editTitleError && (
                      <span
                        className="field-error"
                        style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.25rem' }}
                      >
                        {editTitleError}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={`edit-transcript-${item.id}`}>
                      Transcript
                    </label>
                    <textarea
                      id={`edit-transcript-${item.id}`}
                      value={editTranscript}
                      onChange={(e) => setEditTranscript(e.target.value)}
                      className="form-textarea"
                      placeholder="Paste the interview transcript here..."
                      rows={10}
                    />
                    {editTranscriptError && (
                      <span
                        className="field-error"
                        style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.25rem' }}
                      >
                        {editTranscriptError}
                      </span>
                    )}
                  </div>
                  {editError && <div className="auth-error page-alert">{editError}</div>}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="submit"
                      className="btn-primary btn-sm"
                      disabled={editSaving}
                    >
                      {editSaving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleEditCancel}
                      disabled={editSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div key={item.id} className="interview-card">
                <div className="interview-header">
                  <div>
                    <h3 className="interview-title">{item.title}</h3>
                    {item.projectId && (
                      <Link
                        to="/dashboard/projects/$projectId"
                        params={{ projectId: String(item.projectId) }}
                        className="entity-link"
                      >
                        {projectNameMap.get(item.projectId) || 'Project'}
                      </Link>
                    )}
                  </div>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>

                {item.summary && <p className="interview-summary">{item.summary}</p>}

                <div className="interview-meta">
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="interview-actions">
                  {item.status === 'pending' && (
                    <button
                      onClick={() => handleAnalyze(item.id)}
                      className="btn-primary btn-sm"
                      disabled={analyzing === item.id}
                    >
                      {analyzing === item.id ? 'Analyzing...' : 'Analyze with AI'}
                    </button>
                  )}
                  {item.status === 'analyzed' && item.projectId && (
                    <Link
                      to="/dashboard/specs"
                      search={{ interviewId: item.id, projectId: item.projectId, new: true }}
                      className="btn-secondary btn-sm"
                    >
                      Generate Spec
                    </Link>
                  )}
                  <button
                    onClick={() => handleEditStart(item)}
                    className="btn-secondary btn-sm"
                    aria-label={`Edit ${item.title}`}
                  >
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
