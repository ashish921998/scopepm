import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

type Project = {
  id: number
  name: string
  description: string | null
  status: string
  interviewCount: number
  specCount: number
  pendingInterviewCount: number
  updatedAt: string
}

export const Route = createFileRoute('/dashboard/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await apiFetch<{ projects: Project[] }>('/api/projects')
        setProjects(data.projects)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    void loadProjects()
  }, [])

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Organize discovery and specs around your product areas.</p>
        </div>
        <Link to="/dashboard/projects/new" className="btn-primary">New Project</Link>
      </div>

      {loading ? (
        <p className="loading-text">Loading projects...</p>
      ) : error ? (
        <div className="empty-state">
          <h3>Couldn’t load projects</h3>
          <p>{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Create your first project so interviews and specs have a clear home.</p>
          <Link to="/dashboard/projects/new" className="btn-primary">Create Project</Link>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <Link
              key={project.id}
              to="/dashboard/projects/$projectId"
              params={{ projectId: String(project.id) }}
              className="project-card"
            >
              <div className="project-card-header">
                <div>
                  <h2 className="project-title">{project.name}</h2>
                  <p className="project-description">{project.description || 'No description yet.'}</p>
                </div>
                <span className="status-badge status-pending-soft">{project.pendingInterviewCount} pending</span>
              </div>
              <div className="project-metrics">
                <span>{project.interviewCount} interviews</span>
                <span>{project.specCount} specs</span>
                <span>{project.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
