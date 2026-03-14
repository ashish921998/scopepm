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

// Mock auth client
const mockUseSession = vi.fn()
vi.mock('../../lib/auth-client', () => ({
  useSession: () => mockUseSession(),
}))

// Mock apiFetch
const mockApiFetch = vi.fn()
vi.mock('../../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

// Import after mocks
import { OnboardingPage } from '../../routes/onboarding'

describe('OnboardingPage - form validation', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    // Mock session: authenticated user, onboarding not completed
    mockUseSession.mockReturnValue({
      data: { user: { id: 1, name: 'Test User', email: 'test@example.com' } },
      isPending: false,
    })
    // Mock onboarding status: not completed, no existing profile
    mockApiFetch.mockResolvedValue({
      onboardingCompleted: false,
      profile: null,
    })
  })

  describe('Step 0 (Role) validation', () => {
    it('shows field-error when Continue clicked without selecting a role', async () => {
      render(<OnboardingPage />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading onboarding...')).toBeNull()
      })

      // Click Continue without selecting a role
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(screen.getByText('Please select a role to continue')).toBeDefined()
        const fieldErrors = document.querySelectorAll('.field-error')
        expect(fieldErrors.length).toBeGreaterThan(0)
      })
    })

    it('clears error when a role is selected', async () => {
      render(<OnboardingPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading onboarding...')).toBeNull()
      })

      // Trigger error first
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(screen.getByText('Please select a role to continue')).toBeDefined()
      })

      // Select a role
      fireEvent.click(screen.getByRole('button', { name: 'Product Manager' }))

      await waitFor(() => {
        expect(screen.queryByText('Please select a role to continue')).toBeNull()
      })
    })

    it('allows proceeding to step 1 when role is selected', async () => {
      render(<OnboardingPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading onboarding...')).toBeNull()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Product Manager' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(screen.getByText("Tell us about your team")).toBeDefined()
      })
    })
  })

  describe('Step 1 (Team) validation', () => {
    // Helper to navigate to step 1
    const navigateToStep1 = async () => {
      render(<OnboardingPage />)
      await waitFor(() => {
        expect(screen.queryByText('Loading onboarding...')).toBeNull()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Product Manager' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      await waitFor(() => {
        expect(screen.getByText("Tell us about your team")).toBeDefined()
      })
    }

    it('shows error when company name is empty', async () => {
      await navigateToStep1()

      // Select a team size but no company name
      fireEvent.click(screen.getByRole('button', { name: '1-5' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeDefined()
      })
    })

    it('shows error when team size is not selected', async () => {
      await navigateToStep1()

      // Enter company name but no team size
      fireEvent.change(screen.getByLabelText('Company name'), {
        target: { value: 'Acme Corp' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(screen.getByText('Please select a team size')).toBeDefined()
      })
    })

    it('shows both errors when both company name and team size are missing', async () => {
      await navigateToStep1()

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeDefined()
        expect(screen.getByText('Please select a team size')).toBeDefined()
      })
    })

    it('allows proceeding when both company name and team size are provided', async () => {
      await navigateToStep1()

      fireEvent.change(screen.getByLabelText('Company name'), {
        target: { value: 'Acme Corp' },
      })
      fireEvent.click(screen.getByRole('button', { name: '6-20' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(screen.getByText("What do you want Scope to help with?")).toBeDefined()
      })
    })
  })

  describe('Step 2 (Goals) validation', () => {
    // Helper to navigate to step 2
    const navigateToStep2 = async () => {
      render(<OnboardingPage />)
      await waitFor(() => {
        expect(screen.queryByText('Loading onboarding...')).toBeNull()
      })
      // Step 0
      fireEvent.click(screen.getByRole('button', { name: 'Product Manager' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      await waitFor(() => {
        expect(screen.getByText("Tell us about your team")).toBeDefined()
      })
      // Step 1
      fireEvent.change(screen.getByLabelText('Company name'), {
        target: { value: 'Acme Corp' },
      })
      fireEvent.click(screen.getByRole('button', { name: '1-5' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      await waitFor(() => {
        expect(screen.getByText("What do you want Scope to help with?")).toBeDefined()
      })
    }

    it('shows error when Finish onboarding clicked without selecting a goal', async () => {
      await navigateToStep2()

      mockApiFetch.mockResolvedValue({}) // onboarding submit success
      fireEvent.click(screen.getByRole('button', { name: 'Finish onboarding' }))

      await waitFor(() => {
        expect(screen.getByText('Please select at least one goal')).toBeDefined()
        const fieldErrors = document.querySelectorAll('.field-error')
        expect(fieldErrors.length).toBeGreaterThan(0)
      })

      // Should not have called the onboarding submit endpoint
      const submitCalls = mockApiFetch.mock.calls.filter(
        (call) => call[0] === '/api/onboarding' && call[1]?.method === 'POST',
      )
      expect(submitCalls.length).toBe(0)
    })

    it('clears error when a goal is selected', async () => {
      await navigateToStep2()

      fireEvent.click(screen.getByRole('button', { name: 'Finish onboarding' }))

      await waitFor(() => {
        expect(screen.getByText('Please select at least one goal')).toBeDefined()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Analyze customer interviews' }))

      await waitFor(() => {
        expect(screen.queryByText('Please select at least one goal')).toBeNull()
      })
    })
  })

  describe('Submit button loading state', () => {
    it('disables Finish button and shows loading text while submitting', async () => {
      render(<OnboardingPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading onboarding...')).toBeNull()
      })

      // Go through all steps
      fireEvent.click(screen.getByRole('button', { name: 'Product Manager' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => screen.getByText("Tell us about your team"))

      fireEvent.change(screen.getByLabelText('Company name'), {
        target: { value: 'Acme Corp' },
      })
      fireEvent.click(screen.getByRole('button', { name: '1-5' }))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => screen.getByText("What do you want Scope to help with?"))

      fireEvent.click(screen.getByRole('button', { name: 'Analyze customer interviews' }))

      // Mock a never-resolving promise
      mockApiFetch.mockImplementation(() => new Promise(() => {}))

      fireEvent.click(screen.getByRole('button', { name: 'Finish onboarding' }))

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Saving...' }) as HTMLButtonElement
        expect(btn).toBeDefined()
        expect(btn.disabled).toBe(true)
      })
    })
  })

  describe('Error elements have field-error class', () => {
    it('role error element has field-error class', async () => {
      const { container } = render(<OnboardingPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading onboarding...')).toBeNull()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        const errorEl = container.querySelector('.field-error')
        expect(errorEl).not.toBeNull()
      })
    })
  })
})
