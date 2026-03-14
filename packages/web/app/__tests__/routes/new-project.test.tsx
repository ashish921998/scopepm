import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (_opts: unknown) => ({}),
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode
    to: string
    className?: string
  }) => <a href={to} className={className}>{children}</a>,
  useNavigate: () => vi.fn(),
}))

// Mock apiFetch
const mockApiFetch = vi.fn()
vi.mock('../../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

// Import after mocks
import { NewProjectPage } from '../../routes/dashboard/projects.new'

describe('NewProjectPage - form validation', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it('renders the new project form', () => {
    render(<NewProjectPage />)
    expect(screen.getByLabelText('Project name')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Create project' })).toBeDefined()
  })

  describe('inline field validation', () => {
    it('shows field-error when project name is empty on submit', async () => {
      render(<NewProjectPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeDefined()
        const fieldErrors = document.querySelectorAll('.field-error')
        expect(fieldErrors.length).toBeGreaterThan(0)
      })

      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('shows field-error when project name is whitespace only', async () => {
      render(<NewProjectPage />)

      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: '   ' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeDefined()
      })

      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('error element has class field-error', async () => {
      const { container } = render(<NewProjectPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

      await waitFor(() => {
        const errorEl = container.querySelector('.field-error')
        expect(errorEl).not.toBeNull()
        expect(errorEl?.textContent).toBe('Project name is required')
      })
    })

    it('clears error when user types in the name field', async () => {
      render(<NewProjectPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

      await waitFor(() => {
        expect(screen.getByText('Project name is required')).toBeDefined()
      })

      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: 'My Project' },
      })

      await waitFor(() => {
        expect(screen.queryByText('Project name is required')).toBeNull()
      })
    })
  })

  describe('submit button loading state', () => {
    it('disables button and shows loading text during API request', async () => {
      mockApiFetch.mockImplementation(() => new Promise(() => {}))

      render(<NewProjectPage />)

      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: 'My Project' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Creating...' }) as HTMLButtonElement
        expect(btn).toBeDefined()
        expect(btn.disabled).toBe(true)
      })
    })
  })

  describe('server error display', () => {
    it('shows server error when API throws', async () => {
      mockApiFetch.mockRejectedValue(new Error('Failed to create project'))

      render(<NewProjectPage />)

      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: 'My Project' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

      await waitFor(() => {
        expect(screen.getByText('Failed to create project')).toBeDefined()
      })
    })
  })

  describe('successful submission', () => {
    it('calls apiFetch with project name', async () => {
      const navigate = vi.fn()
      vi.mocked(vi.fn()).mockReturnValue(navigate)

      mockApiFetch.mockResolvedValue({ project: { id: 42 } })

      render(<NewProjectPage />)

      fireEvent.change(screen.getByLabelText('Project name'), {
        target: { value: 'My New Project' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create project' }))

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('My New Project'),
        }))
      })
    })
  })
})
