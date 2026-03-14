import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { apiFetch } from '../../lib/api'

export const Route = createFileRoute('/dashboard/projects/new')({
  component: NewProjectPage,
})

export function NewProjectPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setNameError('')
    setError('')

    if (!name.trim()) {
      setNameError('Project name is required')
      return
    }

    setLoading(true)

    try {
      const data = await apiFetch<{ project: { id: number } }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      })

      navigate({
        to: '/dashboard/projects/$projectId',
        params: { projectId: String(data.project.id) },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setLoading(false)
    }
  }

  return (
    <div className="container narrow-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Create project</h1>
          <p className="page-subtitle">Give your interviews and specs a focused workspace.</p>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="projectName" className="form-label">Project name</label>
            <input
              id="projectName"
              className={`form-input${nameError ? ' form-input--error' : ''}`}
              value={name}
              onChange={(event) => { setName(event.target.value); if (nameError) setNameError('') }}
              placeholder="Voice of customer workflow"
            />
            {nameError && <span className="field-error">{nameError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="projectDescription" className="form-label">Description</label>
            <textarea
              id="projectDescription"
              className="form-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What product area, initiative, or customer workflow does this cover?"
              rows={5}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create project'}
          </button>
        </form>
      </div>
    </div>
  )
}
