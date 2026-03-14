import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

type DashboardOverview = {
  stats: {
    projectCount: number
    interviewCount: number
    specCount: number
    pendingInterviewCount: number
  }
  recentActivity: Array<{
    id: number
    type: 'interview' | 'spec'
    title: string
    status: string
    projectId: number | null
    projectName: string | null
    createdAt: string
  }>
  projects: Array<{
    id: number
    name: string
    description: string | null
    interviewCount: number
    specCount: number
    pendingInterviewCount: number
    updatedAt: string
  }>
}

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const data = await apiFetch<DashboardOverview>('/api/projects/overview')
        setOverview(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    void loadOverview()
  }, [])

  if (loading) {
    return (
      <div className="container">
        <p className="loading-text">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="empty-state">
          <h3>Couldn’t load your dashboard</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!overview || overview.stats.projectCount === 0) {
    return (
      <div className="container">
        <div className="dashboard-header">
          <h1 className="section-title">Welcome to Scope</h1>
          <p className="section-subtitle">
            Create your first project to organize interviews, generate specs, and keep discovery work moving.
          </p>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Start with a project, then add customer interviews and turn them into crisp feature specs.</p>
          <Link to="/dashboard/projects/new" className="btn-primary">
            Create your first project
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1 className="section-title">Your product workspace</h1>
        <p className="section-subtitle">
          Track discovery work across projects, spot pending analysis, and jump back into the next highest leverage task.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-label">Projects</span>
          <strong className="stats-value">{overview.stats.projectCount}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-label">Interviews</span>
          <strong className="stats-value">{overview.stats.interviewCount}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-label">Specs</span>
          <strong className="stats-value">{overview.stats.specCount}</strong>
        </div>
        <div className="stats-card">
          <span className="stats-label">Pending analysis</span>
          <strong className="stats-value">{overview.stats.pendingInterviewCount}</strong>
        </div>
      </div>

      <div className="dashboard-section-grid">
        <section className="dashboard-section-card">
          <div className="section-header-row">
            <div>
              <h2 className="section-card-title">Quick actions</h2>
              <p className="section-card-subtitle">Create the next artifact without digging through menus.</p>
            </div>
          </div>
          <div className="quick-actions-grid">
            <Link to="/dashboard/projects/new" className="dashboard-card dashboard-card-link">
              <div className="feature-icon">📁</div>
              <h3 className="feature-title">New project</h3>
              <p className="feature-description">Set up a workspace for a product area, squad, or initiative.</p>
            </Link>
            <Link to="/dashboard/interviews" search={{ new: true }} className="dashboard-card dashboard-card-link">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">Upload interview</h3>
              <p className="feature-description">Capture a transcript and send it to AI analysis.</p>
            </Link>
            <Link to="/dashboard/specs" search={{ new: true }} className="dashboard-card dashboard-card-link">
              <div className="feature-icon">📋</div>
              <h3 className="feature-title">Create spec</h3>
              <p className="feature-description">Draft a feature spec manually or generate one from an interview.</p>
            </Link>
          </div>
        </section>

        <section className="dashboard-section-card">
          <div className="section-header-row">
            <div>
              <h2 className="section-card-title">Recent activity</h2>
              <p className="section-card-subtitle">Latest work across interviews and specs.</p>
            </div>
          </div>

          {overview.recentActivity.length === 0 ? (
            <p className="loading-text">No recent activity yet.</p>
          ) : (
            <div className="activity-list">
              {overview.recentActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="activity-item">
                  <div>
                    <p className="activity-title">{item.title}</p>
                    <p className="activity-meta">
                      {item.type === 'interview' ? 'Interview' : 'Spec'}
                      {item.projectName ? ` · ${item.projectName}` : ''}
                    </p>
                  </div>
                  <div className="activity-side">
                    <span className={`status-badge status-${item.status}`}>{item.status}</span>
                    <span className="activity-date">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="section-header-row dashboard-projects-header">
        <div>
          <h2 className="section-card-title">Projects</h2>
          <p className="section-card-subtitle">Jump into the areas that need the most attention.</p>
        </div>
        <Link to="/dashboard/projects" className="btn-secondary">View all projects</Link>
      </div>

      <div className="project-grid">
        {overview.projects.map((project) => (
          <Link
            key={project.id}
            to="/dashboard/projects/$projectId"
            params={{ projectId: String(project.id) }}
            className="project-card"
          >
            <div className="project-card-header">
              <div>
                <h3 className="project-title">{project.name}</h3>
                <p className="project-description">{project.description || 'No description yet.'}</p>
              </div>
              <span className="status-badge status-pending-soft">{project.pendingInterviewCount} pending</span>
            </div>
            <div className="project-metrics">
              <span>{project.interviewCount} interviews</span>
              <span>{project.specCount} specs</span>
              <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
