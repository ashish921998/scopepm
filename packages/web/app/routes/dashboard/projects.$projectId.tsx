import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { Skeleton, SkeletonActivityItem, SkeletonStatCard } from '../../components/Skeleton'

type ProjectDetail = {
  project: {
    id: number
    name: string
    description: string | null
    status?: string
    interviewCount: number
    specCount: number
    competitorCount: number
    pendingInterviewCount: number
    updatedAt: string
  }
  recentInterviews: Array<{
    id: number
    title: string
    status: string
    createdAt: string
  }>
  recentSpecs: Array<{
    id: number
    title: string
    status: string
    createdAt: string
  }>
  recentCompetitors: Array<{
    id: number
    url: string
    name: string | null
    status: string
    createdAt: string
  }>
}

export const Route = createFileRoute('/dashboard/projects/$projectId')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const [data, setData] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    const loadProject = async () => {
      try {
        const detail = await apiFetch<ProjectDetail>(`/api/projects/${projectId}`)
        setData(detail)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    void loadProject()
  }, [projectId])

  const handleEditStart = () => {
    if (data) {
      setEditName(data.project.name)
      setEditDescription(data.project.description || '')
      setEditStatus(data.project.status || 'active')
      setIsEditing(true)
      setEditError('')
    }
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditName('')
    setEditDescription('')
    setEditStatus('active')
    setEditError('')
  }

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editName.trim()) {
      setEditError('Project name is required')
      return
    }

    setEditSaving(true)
    setEditError('')

    try {
      const result = await apiFetch<{ project: ProjectDetail['project'] }>(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          status: editStatus,
        }),
      })
      setData((prev) => prev ? { ...prev, project: result.project } : null)
      setIsEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? All interviews and specs will be deleted.')) return

    try {
      await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      window.location.href = '/dashboard/projects'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <div>
            <Skeleton height="40px" width="280px" borderRadius="8px" style={{ marginBottom: '0.75rem' }} />
            <Skeleton height="18px" width="220px" />
          </div>
          <div className="page-header-actions">
            <Skeleton height="42px" width="128px" borderRadius="8px" />
            <Skeleton height="42px" width="100px" borderRadius="8px" />
          </div>
        </div>

        <div className="stats-grid compact-stats-grid">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        <div className="dashboard-section-grid">
          <div className="dashboard-section-card">
            <div className="section-header-row">
              <div>
                <Skeleton height="26px" width="180px" borderRadius="6px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton height="15px" width="220px" />
              </div>
              <Skeleton height="34px" width="72px" borderRadius="6px" />
            </div>
            <div className="activity-list">
              {[...Array(3)].map((_, i) => (
                <SkeletonActivityItem key={i} />
              ))}
            </div>
          </div>

          <div className="dashboard-section-card">
            <div className="section-header-row">
              <div>
                <Skeleton height="26px" width="140px" borderRadius="6px" style={{ marginBottom: '0.5rem' }} />
                <Skeleton height="15px" width="260px" />
              </div>
              <Skeleton height="34px" width="72px" borderRadius="6px" />
            </div>
            <div className="activity-list">
              {[...Array(3)].map((_, i) => (
                <SkeletonActivityItem key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container">
        <div className="empty-state">
          <h3>Could not load this project</h3>
          <p>{error || 'Project not found'}</p>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="container narrow-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Edit project</h1>
            <p className="page-subtitle">Update project details and settings.</p>
          </div>
        </div>

        <div className="form-card">
          <form onSubmit={handleEditSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label className="form-label">Project name</label>
              <input
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What product area, initiative, or customer workflow does this cover?"
                rows={5}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {editError && <div className="auth-error">{editError}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary" disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleEditCancel} disabled={editSaving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{data.project.name}</h1>
          <p className="page-subtitle">{data.project.description || 'No description yet.'}</p>
        </div>
        <div className="page-header-actions">
          <button onClick={handleEditStart} className="btn-secondary">
            Edit
          </button>
          <button onClick={handleDelete} className="btn-ghost">
            Delete
          </button>
          <Link to="/dashboard/interviews" search={{ projectId: data.project.id, new: true }} className="btn-secondary">
            New Interview
          </Link>
          <Link to="/dashboard/competitors" search={{ projectId: data.project.id, new: true }} className="btn-secondary">
            New Competitor
          </Link>
          <Link to="/dashboard/synthesis/$projectId" params={{ projectId: String(data.project.id) }} className="btn-secondary">
            Synthesis
          </Link>
          <Link to="/dashboard/specs" search={{ projectId: data.project.id, new: true }} className="btn-primary">
            New Spec
          </Link>
        </div>
      </div>

      <div className="stats-grid compact-stats-grid">
        <div className="stats-card">
          <span className="stats-label">Interviews</span>
          <strong className="stats-value">{data.project.interviewCount}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-label">Specs</span>
          <strong className="stats-value">{data.project.specCount}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-label">Competitors</span>
          <strong className="stats-value">{data.project.competitorCount}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-label">Pending analysis</span>
          <strong className="stats-value">{data.project.pendingInterviewCount}</strong>
        </div>
      </div>

      <div className="dashboard-section-grid">
        <section className="dashboard-section-card">
          <div className="section-header-row">
            <div>
              <h2 className="section-card-title">Recent interviews</h2>
              <p className="section-card-subtitle">Latest customer conversations for this project.</p>
            </div>
            <Link to="/dashboard/interviews" search={{ projectId: data.project.id }} className="btn-ghost">View all</Link>
          </div>

          {data.recentInterviews.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No interviews yet.</p>
          ) : (
            <div className="activity-list">
              {data.recentInterviews.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <p className="activity-title">{item.title}</p>
                    <p className="activity-meta">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section-card">
          <div className="section-header-row">
            <div>
              <h2 className="section-card-title">Recent specs</h2>
              <p className="section-card-subtitle">Feature definitions generated from your discovery work.</p>
            </div>
            <Link to="/dashboard/specs" search={{ projectId: data.project.id }} className="btn-ghost">View all</Link>
          </div>

          {data.recentSpecs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No specs yet.</p>
          ) : (
            <div className="activity-list">
              {data.recentSpecs.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <p className="activity-title">{item.title}</p>
                    <p className="activity-meta">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section-card">
          <div className="section-header-row">
            <div>
              <h2 className="section-card-title">Recent competitors</h2>
              <p className="section-card-subtitle">Competitor profiles tracked for this project.</p>
            </div>
            <Link to="/dashboard/competitors" search={{ projectId: data.project.id }} className="btn-ghost">View all</Link>
          </div>

          {data.recentCompetitors.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No competitors yet.</p>
          ) : (
            <div className="activity-list">
              {data.recentCompetitors.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <p className="activity-title">{item.name || item.url}</p>
                    <p className="activity-meta">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
