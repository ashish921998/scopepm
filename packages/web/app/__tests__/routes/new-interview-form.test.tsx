import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({
    useSearch: () => ({ new: true, projectId: undefined }),
  }),
  Link: ({
    children,
    to,
    className,
    search,
  }: {
    children: React.ReactNode
    to: string
    className?: string
    search?: Record<string, unknown>
  }) => (
    <a href={to} className={className} data-search={JSON.stringify(search)}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({ new: true, projectId: undefined }),
}))

// Mock apiFetch
const mockApiFetch = vi.fn()
vi.mock('../../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

// Mock Skeleton component
vi.mock('../../components/Skeleton', () => ({
  SkeletonInterviewCard: () => <div data-testid="skeleton-card" />,
}))

// Import after mocks
import { InterviewsPage } from '../../routes/dashboard/interviews'

const mockProjects = [
  { id: 1, name: 'Project Alpha' },
  { id: 2, name: 'Project Beta' },
]

const mockInterviews = [
  {
    id: 1,
    projectId: 1,
    title: 'Interview One',
    transcript: 'Sample transcript',
    summary: null,
    insights: null,
    status: 'pending',
    createdAt: '2024-01-01T00:00:00Z',
  },
]

describe('InterviewsPage - new interview form validation', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({
      projects: mockProjects,
      interviews: mockInterviews,
    })
  })

  const renderAndWait = async () => {
    const result = render(<InterviewsPage />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-card')).toBeNull()
    })

    return result
  }

  it('renders New Interview button', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined() // showForm is true due to search.new
  })

  describe('inline field validation', () => {
    it('shows error when no project is selected', async () => {
      await renderAndWait()

      // Form is visible (search.new = true), click submit without filling
      fireEvent.click(screen.getByRole('button', { name: 'Create Interview' }))

      await waitFor(() => {
        expect(screen.getByText('Please select a project')).toBeDefined()
      })

      // Should not call API for create
      expect(mockApiFetch).toHaveBeenCalledTimes(2) // only the initial load calls
    })

    it('shows error when title is shorter than 3 characters', async () => {
      await renderAndWait()

      // Select a project
      const projectSelect = screen.getByDisplayValue('Select a project')
      fireEvent.change(projectSelect, { target: { value: '1' } })

      // Enter a short title
      const titleInput = screen.getByPlaceholderText('Customer interview with Acme')
      fireEvent.change(titleInput, { target: { value: 'ab' } })

      // Enter sufficient transcript
      const transcriptArea = screen.getByPlaceholderText('Paste the interview transcript here...')
      fireEvent.change(transcriptArea, { target: { value: 'This is a long enough transcript to pass validation at 50 chars.' } })

      fireEvent.click(screen.getByRole('button', { name: 'Create Interview' }))

      await waitFor(() => {
        expect(screen.getByText('Title must be at least 3 characters')).toBeDefined()
      })

      expect(mockApiFetch).toHaveBeenCalledTimes(2) // no create call
    })

    it('shows error when transcript is shorter than 50 characters', async () => {
      await renderAndWait()

      // Select a project
      const projectSelect = screen.getByDisplayValue('Select a project')
      fireEvent.change(projectSelect, { target: { value: '1' } })

      // Enter a valid title
      const titleInput = screen.getByPlaceholderText('Customer interview with Acme')
      fireEvent.change(titleInput, { target: { value: 'Valid Title Here' } })

      // Enter a short transcript
      const transcriptArea = screen.getByPlaceholderText('Paste the interview transcript here...')
      fireEvent.change(transcriptArea, { target: { value: 'Too short' } })

      fireEvent.click(screen.getByRole('button', { name: 'Create Interview' }))

      await waitFor(() => {
        expect(screen.getByText('Transcript must be at least 50 characters')).toBeDefined()
      })

      expect(mockApiFetch).toHaveBeenCalledTimes(2) // no create call
    })

    it('shows all three errors when all fields are invalid', async () => {
      await renderAndWait()

      // Don't fill any fields, just submit
      fireEvent.click(screen.getByRole('button', { name: 'Create Interview' }))

      await waitFor(() => {
        expect(screen.getByText('Please select a project')).toBeDefined()
        expect(screen.getByText('Title must be at least 3 characters')).toBeDefined()
        expect(screen.getByText('Transcript must be at least 50 characters')).toBeDefined()
      })

      expect(mockApiFetch).toHaveBeenCalledTimes(2) // no create call
    })

    it('error elements have field-error class', async () => {
      const { container } = await renderAndWait()

      fireEvent.click(screen.getByRole('button', { name: 'Create Interview' }))

      await waitFor(() => {
        const fieldErrors = container.querySelectorAll('.field-error')
        expect(fieldErrors.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('submit button loading state', () => {
    it('disables button and shows loading text while saving', async () => {
      // Default mock loads data correctly
      await renderAndWait()

      // Fill all required fields
      const projectSelect = screen.getByDisplayValue('Select a project')
      fireEvent.change(projectSelect, { target: { value: '1' } })

      const titleInput = screen.getByPlaceholderText('Customer interview with Acme')
      fireEvent.change(titleInput, { target: { value: 'Customer Interview Title' } })

      const transcriptArea = screen.getByPlaceholderText('Paste the interview transcript here...')
      fireEvent.change(transcriptArea, {
        target: { value: 'This is a sufficiently long transcript that is more than fifty characters long.' },
      })

      // Mock the create call to never resolve (next apiFetch call)
      mockApiFetch.mockImplementationOnce(() => new Promise(() => {}))

      fireEvent.click(screen.getByRole('button', { name: 'Create Interview' }))

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Creating...' }) as HTMLButtonElement
        expect(btn).toBeDefined()
        expect(btn.disabled).toBe(true)
      })
    })
  })

  describe('server error display', () => {
    it('shows server error inside form when create fails', async () => {
      await renderAndWait()

      // Fill all required fields
      const projectSelect = screen.getByDisplayValue('Select a project')
      fireEvent.change(projectSelect, { target: { value: '1' } })

      const titleInput = screen.getByPlaceholderText('Customer interview with Acme')
      fireEvent.change(titleInput, { target: { value: 'Valid Interview Title' } })

      const transcriptArea = screen.getByPlaceholderText('Paste the interview transcript here...')
      fireEvent.change(transcriptArea, {
        target: { value: 'This is a sufficiently long transcript that is more than fifty characters long.' },
      })

      // Mock create to fail
      mockApiFetch.mockRejectedValueOnce(new Error('Server error occurred'))

      fireEvent.click(screen.getByRole('button', { name: 'Create Interview' }))

      await waitFor(() => {
        expect(screen.getByText('Server error occurred')).toBeDefined()
      })
    })
  })
})
