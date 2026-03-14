import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({
    useSearch: () => ({ new: true, projectId: undefined, interviewId: undefined }),
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
  useSearch: () => ({ new: true, projectId: undefined, interviewId: undefined }),
}))

// Mock apiFetch
const mockApiFetch = vi.fn()
vi.mock('../../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

// Mock Skeleton component
vi.mock('../../components/Skeleton', () => ({
  SkeletonSpecCard: () => <div data-testid="skeleton-card" />,
}))

// Import after mocks
import { SpecsPage } from '../../routes/dashboard/specs'

const mockProjects = [
  { id: 1, name: 'Project Alpha' },
  { id: 2, name: 'Project Beta' },
]

const mockSpecs = [
  {
    id: 1,
    projectId: 1,
    title: 'Spec One',
    description: 'Sample description',
    acceptanceCriteria: null,
    priority: 'medium',
    status: 'draft',
    createdAt: '2024-01-01T00:00:00Z',
    interviewId: null,
  },
]

const mockInterviews = [
  {
    id: 1,
    projectId: 1,
    title: 'Interview One',
    status: 'analyzed',
  },
]

describe('SpecsPage - new spec form validation', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({
      projects: mockProjects,
      specs: mockSpecs,
      interviews: mockInterviews,
    })
  })

  const renderAndWait = async () => {
    const result = render(<SpecsPage />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-card')).toBeNull()
    })

    return result
  }

  it('renders New Spec form when search.new is true', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined()
  })

  describe('inline field validation', () => {
    it('shows error when no project is selected', async () => {
      await renderAndWait()

      fireEvent.click(screen.getByRole('button', { name: 'Create Spec' }))

      await waitFor(() => {
        expect(screen.getByText('Please select a project')).toBeDefined()
      })

      // Should not call API for create
      expect(mockApiFetch).toHaveBeenCalledTimes(3) // only initial load calls
    })

    it('shows error when title is shorter than 3 characters', async () => {
      await renderAndWait()

      // Select a project
      const projectSelects = screen.getAllByDisplayValue('Select a project')
      fireEvent.change(projectSelects[0], { target: { value: '1' } })

      // Enter short title
      const titleInput = screen.getByPlaceholderText('Collaborative interview repository')
      fireEvent.change(titleInput, { target: { value: 'ab' } })

      // Enter valid description
      const descriptionArea = screen.getByPlaceholderText(
        'Describe the feature, the problem it solves, and expected outcome.',
      )
      fireEvent.change(descriptionArea, {
        target: { value: 'This description is definitely long enough at 20+ chars.' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Create Spec' }))

      await waitFor(() => {
        expect(screen.getByText('Title must be at least 3 characters')).toBeDefined()
      })

      expect(mockApiFetch).toHaveBeenCalledTimes(3) // no create call
    })

    it('shows error when description is shorter than 20 characters', async () => {
      await renderAndWait()

      // Select a project
      const projectSelects = screen.getAllByDisplayValue('Select a project')
      fireEvent.change(projectSelects[0], { target: { value: '1' } })

      // Enter valid title
      const titleInput = screen.getByPlaceholderText('Collaborative interview repository')
      fireEvent.change(titleInput, { target: { value: 'Valid Spec Title' } })

      // Enter short description
      const descriptionArea = screen.getByPlaceholderText(
        'Describe the feature, the problem it solves, and expected outcome.',
      )
      fireEvent.change(descriptionArea, { target: { value: 'Too short' } })

      fireEvent.click(screen.getByRole('button', { name: 'Create Spec' }))

      await waitFor(() => {
        expect(screen.getByText('Description must be at least 20 characters')).toBeDefined()
      })

      expect(mockApiFetch).toHaveBeenCalledTimes(3) // no create call
    })

    it('shows all three errors when all required fields are invalid', async () => {
      await renderAndWait()

      fireEvent.click(screen.getByRole('button', { name: 'Create Spec' }))

      await waitFor(() => {
        expect(screen.getByText('Please select a project')).toBeDefined()
        expect(screen.getByText('Title must be at least 3 characters')).toBeDefined()
        expect(screen.getByText('Description must be at least 20 characters')).toBeDefined()
      })

      expect(mockApiFetch).toHaveBeenCalledTimes(3) // no create call
    })

    it('error elements have field-error class', async () => {
      const { container } = await renderAndWait()

      fireEvent.click(screen.getByRole('button', { name: 'Create Spec' }))

      await waitFor(() => {
        const fieldErrors = container.querySelectorAll('.field-error')
        expect(fieldErrors.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('submit button loading state', () => {
    it('disables button and shows loading text while saving', async () => {
      await renderAndWait()

      // Fill all required fields
      const projectSelects = screen.getAllByDisplayValue('Select a project')
      fireEvent.change(projectSelects[0], { target: { value: '1' } })

      const titleInput = screen.getByPlaceholderText('Collaborative interview repository')
      fireEvent.change(titleInput, { target: { value: 'Valid Spec Title Here' } })

      const descriptionArea = screen.getByPlaceholderText(
        'Describe the feature, the problem it solves, and expected outcome.',
      )
      fireEvent.change(descriptionArea, {
        target: { value: 'This is a sufficiently long description for the spec.' },
      })

      // Mock create call to never resolve
      mockApiFetch.mockImplementationOnce(() => new Promise(() => {}))

      fireEvent.click(screen.getByRole('button', { name: 'Create Spec' }))

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Saving...' }) as HTMLButtonElement
        expect(btn).toBeDefined()
        expect(btn.disabled).toBe(true)
      })
    })
  })

  describe('server error display', () => {
    it('shows server error inside form when create fails', async () => {
      await renderAndWait()

      // Fill all required fields
      const projectSelects = screen.getAllByDisplayValue('Select a project')
      fireEvent.change(projectSelects[0], { target: { value: '1' } })

      const titleInput = screen.getByPlaceholderText('Collaborative interview repository')
      fireEvent.change(titleInput, { target: { value: 'Valid Spec Title Here' } })

      const descriptionArea = screen.getByPlaceholderText(
        'Describe the feature, the problem it solves, and expected outcome.',
      )
      fireEvent.change(descriptionArea, {
        target: { value: 'This is a sufficiently long description for the spec.' },
      })

      // Mock create to fail
      mockApiFetch.mockRejectedValueOnce(new Error('Spec creation failed'))

      fireEvent.click(screen.getByRole('button', { name: 'Create Spec' }))

      await waitFor(() => {
        expect(screen.getByText('Spec creation failed')).toBeDefined()
      })
    })
  })
})
