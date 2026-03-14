import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

type ProjectDetail = {
  project: {
    id: number
    name: string
    description: string | null
    interviewCount: number
    specCount: number
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
}

export const Route = createFileRoute('/dashboard/projects/$projectId')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const [data, setData] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) {
    return (
      <div className="container">
        <p className="loading-text">Loading project...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container">
        <div className="empty-state">
          <h3>Couldn’t load this project</h3>
          <p>{error || 'Project not found'}</p>
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
          <Link to="/dashboard/interviews" search={{ projectId: data.project.id, new: true }} className="btn-secondary">
            New Interview
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
            <p className="loading-text">No interviews yet.</p>
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
            <p className="loading-text">No specs yet.</p>
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
      </div>
    </div>
  )
}
