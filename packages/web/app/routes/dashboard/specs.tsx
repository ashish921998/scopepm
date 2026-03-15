import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { SkeletonSpecCard } from '../../components/Skeleton'

type FeatureSpec = {
  id: number
  projectId: number | null
  title: string
  description: string
  acceptanceCriteria: string | null
  priority: string
  status: string
  createdAt: string
  interviewId: number | null
}

// Status options for specs
const SPEC_STATUSES = ['draft', 'in_review', 'approved', 'in_progress', 'completed'] as const

type Project = {
  id: number
  name: string
}

type Interview = {
  id: number
  projectId: number | null
  title: string
  status: string
}

export const Route = createFileRoute('/dashboard/specs')({
  validateSearch: (search: Record<string, unknown>): { interviewId?: number; projectId?: number; new?: boolean } => {
    const nextInterviewId = typeof search.interviewId === 'string'
      ? Number(search.interviewId)
      : typeof search.interviewId === 'number'
        ? search.interviewId
        : undefined
    const nextProjectId = typeof search.projectId === 'string'
      ? Number(search.projectId)
      : typeof search.projectId === 'number'
        ? search.projectId
        : undefined

    return {
      interviewId: Number.isFinite(nextInterviewId) ? nextInterviewId : undefined,
      projectId: Number.isFinite(nextProjectId) ? nextProjectId : undefined,
      new: search.new === true || search.new === 'true' ? true : undefined,
    }
  },
  component: SpecsPage,
})

export function SpecsPage() {
  const search = Route.useSearch()
  const initialProjectId = search.projectId
  const initialInterviewId = search.interviewId
  const [specs, setSpecs] = useState<FeatureSpec[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(Boolean(search.new))
  const [projectId, setProjectId] = useState<string>(initialProjectId ? String(initialProjectId) : '')
  const [interviewId, setInterviewId] = useState<string>(initialInterviewId ? String(initialInterviewId) : '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [acceptanceCriteriaInput, setAcceptanceCriteriaInput] = useState('')
  const [priority, setPriority] = useState('medium')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // New spec form field errors
  const [projectIdError, setProjectIdError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [formError, setFormError] = useState('')

  // Edit spec state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [editStatus, setEditStatus] = useState('draft')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    setShowForm(Boolean(search.new))
    setProjectId(initialProjectId ? String(initialProjectId) : '')
    setInterviewId(initialInterviewId ? String(initialInterviewId) : '')
  }, [search.new, initialProjectId, initialInterviewId])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectData, specData, interviewData] = await Promise.all([
          apiFetch<{ projects: Project[] }>('/api/projects'),
          apiFetch<{ specs: FeatureSpec[] }>(initialProjectId ? `/api/specs?projectId=${initialProjectId}` : '/api/specs'),
          apiFetch<{ interviews: Interview[] }>('/api/interviews'),
        ])

        setProjects(projectData.projects)
        setSpecs(specData.specs)
        setInterviews(interviewData.interviews)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load specs')
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

  const analyzedInterviews = interviews.filter((item) => {
    if (item.status !== 'analyzed') return false
    if (!projectId) return true
    return item.projectId === Number(projectId)
  })

  const handleGenerateFromInterview = async (targetInterviewId: number) => {
    setGenerating(true)
    setError('')

    try {
      const data = await apiFetch<{ spec: FeatureSpec }>('/api/specs/generate', {
        method: 'POST',
        body: JSON.stringify({ interviewId: targetInterviewId }),
      })
      setSpecs((current) => [data.spec, ...current])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate spec')
    } finally {
      setGenerating(false)
    }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    setProjectIdError('')
    setTitleError('')
    setDescriptionError('')
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

    if (!description.trim() || description.trim().length < 20) {
      setDescriptionError('Description must be at least 20 characters')
      valid = false
    }

    if (!valid) return

    setSaving(true)

    try {
      const data = await apiFetch<{ spec: FeatureSpec }>('/api/specs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: Number(projectId),
          interviewId: interviewId ? Number(interviewId) : null,
          title,
          description,
          acceptanceCriteria: acceptanceCriteriaInput
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          priority,
        }),
      })

      setSpecs((current) => [data.spec, ...current])
      setShowForm(false)
      setTitle('')
      setDescription('')
      setAcceptanceCriteriaInput('')
      setInterviewId('')
      setPriority('medium')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create spec')
      setSaving(false)
      return
    }

    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this spec?')) return

    try {
      await apiFetch(`/api/specs/${id}`, { method: 'DELETE' })
      setSpecs((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete spec')
    }
  }

  const handleEditStart = (spec: FeatureSpec) => {
    setEditingId(spec.id)
    setEditTitle(spec.title)
    setEditDescription(spec.description)
    setEditAcceptanceCriteria(parseAcceptanceCriteria(spec.acceptanceCriteria).join('\n'))
    setEditPriority(spec.priority)
    setEditStatus(spec.status)
    setEditError('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditTitle('')
    setEditDescription('')
    setEditAcceptanceCriteria('')
    setEditPriority('medium')
    setEditStatus('draft')
    setEditError('')
  }

  const handleEditSubmit = async (id: number, event: React.FormEvent) => {
    event.preventDefault()
    setEditError('')

    if (!editTitle.trim() || editTitle.trim().length < 3) {
      setEditError('Title must be at least 3 characters')
      return
    }

    if (!editDescription.trim() || editDescription.trim().length < 20) {
      setEditError('Description must be at least 20 characters')
      return
    }

    setEditSaving(true)

    try {
      const data = await apiFetch<{ spec: FeatureSpec }>(`/api/specs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          acceptanceCriteria: editAcceptanceCriteria
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          priority: editPriority,
          status: editStatus,
        }),
      })
      setSpecs((current) => current.map((item) => (item.id === id ? data.spec : item)))
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update spec')
    } finally {
      setEditSaving(false)
    }
  }

  const handleExportMarkdown = (spec: FeatureSpec) => {
    const criteria = parseAcceptanceCriteria(spec.acceptanceCriteria)
    const markdown = `# ${spec.title}

**Priority:** ${spec.priority}
**Status:** ${spec.status}
**Created:** ${new Date(spec.createdAt).toLocaleDateString()}

## Description

${spec.description}

${criteria.length > 0 ? `## Acceptance Criteria

${criteria.map((c) => `- [ ] ${c}`).join('\n')}` : ''}
`
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseAcceptanceCriteria = (criteria: string | null): string[] => {
    if (!criteria) return []

    try {
      return JSON.parse(criteria)
    } catch {
      return []
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Feature Specs</h1>
          <p className="page-subtitle">
            {initialProjectId
              ? `Feature specs for ${projectNameMap.get(initialProjectId) || 'this project'}`
              : 'Manual and AI-generated feature specifications from interview insights'}
          </p>
        </div>
        <div className="page-header-actions">
          {initialInterviewId && (
            <button
              onClick={() => handleGenerateFromInterview(initialInterviewId)}
              className="btn-secondary"
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate from interview'}
            </button>
          )}
          <button onClick={() => setShowForm((current) => !current)} className="btn-primary">
            {showForm ? 'Cancel' : 'New Spec'}
          </button>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="filter-row">
          <Link to="/dashboard/specs" className={`filter-chip ${!initialProjectId ? 'is-active' : ''}`}>All projects</Link>
          {projects.map((item) => (
            <Link
              key={item.id}
              to="/dashboard/specs"
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
          <form onSubmit={handleCreate} className="auth-form" noValidate>
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
              <label className="form-label">Source interview (optional)</label>
              <select value={interviewId} onChange={(event) => setInterviewId(event.target.value)} className="form-input">
                <option value="">No linked interview</option>
                {analyzedInterviews.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => { setTitle(event.target.value); if (titleError) setTitleError('') }}
                className={`form-input${titleError ? ' form-input--error' : ''}`}
                placeholder="Collaborative interview repository"
              />
              {titleError && <span className="field-error">{titleError}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={description}
                onChange={(event) => { setDescription(event.target.value); if (descriptionError) setDescriptionError('') }}
                className={`form-textarea${descriptionError ? ' form-textarea--error' : ''}`}
                rows={6}
                placeholder="Describe the feature, the problem it solves, and expected outcome."
              />
              {descriptionError && <span className="field-error">{descriptionError}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Acceptance criteria</label>
              <textarea
                value={acceptanceCriteriaInput}
                onChange={(event) => setAcceptanceCriteriaInput(event.target.value)}
                className="form-textarea"
                rows={5}
                placeholder="One criterion per line"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="form-input">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {formError && <div className="auth-error page-alert">{formError}</div>}
            <button type="submit" className="btn-primary" disabled={saving || projects.length === 0}>
              {saving ? 'Saving...' : 'Create Spec'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="spec-list">
          {[...Array(3)].map((_, i) => (
            <SkeletonSpecCard key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>Create a project first</h3>
          <p>Projects give your specs a home and make interviews easier to track.</p>
          <Link to="/dashboard/projects/new" className="btn-primary">Create Project</Link>
        </div>
      ) : specs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No feature specs yet</h3>
          <p>Analyze an interview first, or create a spec manually for your next build.</p>
        </div>
      ) : (
        <div className="spec-list">
          {specs.map((spec) =>
            editingId === spec.id ? (
              <div key={spec.id} className="spec-card">
                <form onSubmit={(e) => handleEditSubmit(spec.id, e)} className="auth-form">
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="form-textarea"
                      rows={6}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Acceptance criteria</label>
                    <textarea
                      value={editAcceptanceCriteria}
                      onChange={(e) => setEditAcceptanceCriteria(e.target.value)}
                      className="form-textarea"
                      rows={5}
                      placeholder="One criterion per line"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="form-input">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="form-input">
                      {SPEC_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
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
              <div key={spec.id} className="spec-card">
                <div className="spec-header">
                  <div>
                    <h3 className="spec-title">{spec.title}</h3>
                    {spec.projectId && (
                      <Link
                        to="/dashboard/projects/$projectId"
                        params={{ projectId: String(spec.projectId) }}
                        className="entity-link"
                      >
                        {projectNameMap.get(spec.projectId) || 'Project'}
                      </Link>
                    )}
                  </div>
                  <div className="spec-badges">
                    <span className={`priority-badge priority-${spec.priority}`}>{spec.priority}</span>
                    <span className={`status-badge status-${spec.status}`}>{spec.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <p className="spec-description">{spec.description}</p>

                {parseAcceptanceCriteria(spec.acceptanceCriteria).length > 0 && (
                  <div className="spec-criteria">
                    <h4>Acceptance Criteria</h4>
                    <ul>
                      {parseAcceptanceCriteria(spec.acceptanceCriteria).map((criterion, index) => (
                        <li key={index}>{criterion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="spec-meta">
                  <span>{new Date(spec.createdAt).toLocaleDateString()}</span>
                  {spec.interviewId && <span>Linked interview #{spec.interviewId}</span>}
                </div>

                <div className="spec-actions">
                  <button onClick={() => handleEditStart(spec)} className="btn-secondary btn-sm">
                    Edit
                  </button>
                  <button onClick={() => handleExportMarkdown(spec)} className="btn-ghost btn-sm">
                    Export MD
                  </button>
                  <button onClick={() => handleDelete(spec.id)} className="btn-ghost btn-sm">
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
