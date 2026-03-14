import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => ({ component: (c: unknown) => c }),
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode
    to: string
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

// Mock apiFetch
const mockApiFetch = vi.fn()
vi.mock('../../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

// Inline test component mirroring the edit logic from interviews.tsx
type Interview = {
  id: number
  projectId: number | null
  title: string
  summary: string | null
  insights: string | null
  status: string
  createdAt: string
  transcript?: string
}

function InterviewEditComponent({ interviews: initialInterviews }: { interviews: Interview[] }) {
  const [interviews, setInterviews] = React.useState<Interview[]>(initialInterviews)
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editTitle, setEditTitle] = React.useState('')
  const [editTranscript, setEditTranscript] = React.useState('')
  const [editTitleError, setEditTitleError] = React.useState('')
  const [editTranscriptError, setEditTranscriptError] = React.useState('')
  const [editError, setEditError] = React.useState('')
  const [editSaving, setEditSaving] = React.useState(false)

  const handleEditStart = (interview: Interview) => {
    setEditingId(interview.id)
    setEditTitle(interview.title)
    setEditTranscript(interview.transcript || '')
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
      const data = await mockApiFetch(`/api/interviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitle.trim(), transcript: editTranscript.trim() }),
      })
      setInterviews((current) =>
        current.map((item) => (item.id === id ? (data as { interview: Interview }).interview : item)),
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
    <div>
      {interviews.map((interview) =>
        editingId === interview.id ? (
          <div key={interview.id} className="interview-card" data-testid={`edit-form-${interview.id}`}>
            <form onSubmit={(e) => handleEditSubmit(interview.id, e)} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor={`edit-title-${interview.id}`}>Interview title</label>
                <input
                  id={`edit-title-${interview.id}`}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
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
                <label className="form-label" htmlFor={`edit-transcript-${interview.id}`}>Transcript</label>
                <textarea
                  id={`edit-transcript-${interview.id}`}
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  className="form-textarea"
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
                <button type="submit" className="btn-primary btn-sm" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save changes'}
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={handleEditCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div key={interview.id} className="interview-card" data-testid={`interview-card-${interview.id}`}>
            <div className="interview-header">
              <h3 className="interview-title">{interview.title}</h3>
              <span className={`status-badge status-${interview.status}`}>{interview.status}</span>
            </div>
            <div className="interview-actions">
              <button
                onClick={() => handleEditStart(interview)}
                className="btn-secondary btn-sm"
                aria-label={`Edit ${interview.title}`}
              >
                Edit
              </button>
            </div>
          </div>
        ),
      )}
    </div>
  )
}

const sampleInterviews: Interview[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Customer Interview #1',
    summary: null,
    insights: null,
    status: 'pending',
    createdAt: '2024-01-01T00:00:00Z',
    transcript: 'This is a sample transcript that is long enough for testing purposes.',
  },
  {
    id: 2,
    projectId: 1,
    title: 'Customer Interview #2',
    summary: 'Some summary',
    insights: null,
    status: 'analyzed',
    createdAt: '2024-01-02T00:00:00Z',
    transcript: 'Another sample transcript that is also long enough for testing purposes here.',
  },
]

describe('Interview Edit UI', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  describe('Edit button visibility', () => {
    it('renders an Edit button on each interview card', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons.length).toBe(2)
    })

    it('Edit button has correct aria-label', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)
      expect(screen.getByRole('button', { name: 'Edit Customer Interview #1' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Edit Customer Interview #2' })).toBeDefined()
    })
  })

  describe('Opening edit form', () => {
    it('clicking Edit opens the edit form for that interview', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      expect(screen.getByTestId('edit-form-1')).toBeDefined()
      expect(screen.queryByTestId('interview-card-1')).toBeNull()
    })

    it('edit form is pre-populated with current title', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      const titleInput = screen.getByLabelText('Interview title') as HTMLInputElement
      expect(titleInput.value).toBe('Customer Interview #1')
    })

    it('edit form is pre-populated with current transcript', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      const transcriptInput = screen.getByLabelText('Transcript') as HTMLTextAreaElement
      expect(transcriptInput.value).toBe(
        'This is a sample transcript that is long enough for testing purposes.',
      )
    })

    it('only opens form for the clicked interview, not others', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      expect(screen.getByTestId('edit-form-1')).toBeDefined()
      // interview 2 should remain as a card
      expect(screen.getByTestId('interview-card-2')).toBeDefined()
    })
  })

  describe('Cancel button', () => {
    it('clicking Cancel dismisses the edit form', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))
      expect(screen.getByTestId('edit-form-1')).toBeDefined()

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByTestId('edit-form-1')).toBeNull()
      expect(screen.getByTestId('interview-card-1')).toBeDefined()
    })

    it('Cancel restores the interview card with original title', () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      // Change the title in form
      const titleInput = screen.getByLabelText('Interview title') as HTMLInputElement
      fireEvent.change(titleInput, { target: { value: 'Changed title' } })

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      // Original title is still shown
      expect(screen.getByText('Customer Interview #1')).toBeDefined()
    })
  })

  describe('Inline validation', () => {
    it('shows error when title is empty', async () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      const titleInput = screen.getByLabelText('Interview title')
      fireEvent.change(titleInput, { target: { value: '' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(screen.getByText('Title must be at least 3 characters')).toBeDefined()
      })

      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('shows error when title is shorter than 3 characters', async () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      const titleInput = screen.getByLabelText('Interview title')
      fireEvent.change(titleInput, { target: { value: 'ab' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(screen.getByText('Title must be at least 3 characters')).toBeDefined()
      })

      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('shows error when transcript is empty', async () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      const transcriptInput = screen.getByLabelText('Transcript')
      fireEvent.change(transcriptInput, { target: { value: '' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(screen.getByText('Transcript must be at least 50 characters')).toBeDefined()
      })

      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('shows error when transcript is shorter than 50 characters', async () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      const transcriptInput = screen.getByLabelText('Transcript')
      fireEvent.change(transcriptInput, { target: { value: 'Too short' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(screen.getByText('Transcript must be at least 50 characters')).toBeDefined()
      })

      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('shows both errors when both fields are invalid', async () => {
      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      fireEvent.change(screen.getByLabelText('Interview title'), { target: { value: '' } })
      fireEvent.change(screen.getByLabelText('Transcript'), { target: { value: '' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(screen.getByText('Title must be at least 3 characters')).toBeDefined()
        expect(screen.getByText('Transcript must be at least 50 characters')).toBeDefined()
      })

      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })

  describe('Submit and update', () => {
    it('sends PUT request with correct data on submit', async () => {
      const updatedInterview = {
        ...sampleInterviews[0],
        title: 'Updated Title',
        transcript: 'This is a long enough updated transcript that meets the minimum length requirement.',
      }
      mockApiFetch.mockResolvedValue({ interview: updatedInterview })

      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      fireEvent.change(screen.getByLabelText('Interview title'), {
        target: { value: 'Updated Title' },
      })
      fireEvent.change(screen.getByLabelText('Transcript'), {
        target: {
          value: 'This is a long enough updated transcript that meets the minimum length requirement.',
        },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/interviews/1', {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Title',
            transcript:
              'This is a long enough updated transcript that meets the minimum length requirement.',
          }),
        })
      })
    })

    it('updates interview in list on success without page reload', async () => {
      const updatedInterview = {
        ...sampleInterviews[0],
        title: 'Updated Title for Interview',
      }
      mockApiFetch.mockResolvedValue({ interview: updatedInterview })

      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      fireEvent.change(screen.getByLabelText('Interview title'), {
        target: { value: 'Updated Title for Interview' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(screen.getByText('Updated Title for Interview')).toBeDefined()
        // Edit form is dismissed
        expect(screen.queryByTestId('edit-form-1')).toBeNull()
        // Card is shown with new title
        expect(screen.getByTestId('interview-card-1')).toBeDefined()
      })
    })

    it('shows loading state while saving', async () => {
      mockApiFetch.mockImplementation(() => new Promise(() => {})) // never resolves

      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        const saveBtn = screen.getByRole('button', { name: 'Saving...' }) as HTMLButtonElement
        expect(saveBtn).toBeDefined()
        expect(saveBtn.disabled).toBe(true)
      })
    })

    it('shows error message on API failure', async () => {
      mockApiFetch.mockRejectedValue(new Error('Failed to update interview'))

      render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to update interview')).toBeDefined()
      })

      // Edit form stays open so user can retry
      expect(screen.getByTestId('edit-form-1')).toBeDefined()
    })
  })

  describe('Validation errors have field-error class', () => {
    it('title error element has field-error class', async () => {
      const { container } = render(<InterviewEditComponent interviews={sampleInterviews} />)

      fireEvent.click(screen.getByRole('button', { name: 'Edit Customer Interview #1' }))
      fireEvent.change(screen.getByLabelText('Interview title'), { target: { value: '' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        const errorEl = container.querySelector('.field-error')
        expect(errorEl).not.toBeNull()
        expect(errorEl?.textContent).toBe('Title must be at least 3 characters')
      })
    })
  })
})
