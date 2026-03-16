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
const mockSignInEmail = vi.fn()
vi.mock('../../lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => mockSignInEmail(...args),
    },
  },
}))

// Import after mocks
import { SignInPage } from '../../routes/sign-in'

describe('SignInPage', () => {
  beforeEach(() => {
    mockSignInEmail.mockReset()
  })

  it('renders the sign-in form', () => {
    render(<SignInPage />)
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDefined()
  })

  describe('inline field validation', () => {
    it('shows field-error for empty email on submit', async () => {
      render(<SignInPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        const errors = document.querySelectorAll('.field-error')
        expect(errors.length).toBeGreaterThan(0)
        expect(screen.getByText('Email is required')).toBeDefined()
      })

      expect(mockSignInEmail).not.toHaveBeenCalled()
    })

    it('shows field-error for invalid email format', async () => {
      render(<SignInPage />)

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'not-an-email' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'somepassword' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeDefined()
      })

      expect(mockSignInEmail).not.toHaveBeenCalled()
    })

    it('shows field-error for empty password on submit', async () => {
      render(<SignInPage />)

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'user@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeDefined()
      })

      expect(mockSignInEmail).not.toHaveBeenCalled()
    })

    it('does not submit when both fields are invalid', async () => {
      render(<SignInPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeDefined()
        expect(screen.getByText('Password is required')).toBeDefined()
      })

      expect(mockSignInEmail).not.toHaveBeenCalled()
    })

    it('error elements have class field-error', async () => {
      render(<SignInPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        const fieldErrors = document.querySelectorAll('.field-error')
        expect(fieldErrors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('submit button loading state', () => {
    it('disables button and shows loading text during API request', async () => {
      // Never-resolving promise to keep loading state
      mockSignInEmail.mockImplementation(() => new Promise(() => {}))

      render(<SignInPage />)

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'user@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Signing in...' }) as HTMLButtonElement
        expect(btn).toBeDefined()
        expect(btn.disabled).toBe(true)
      })
    })
  })

  describe('server error display', () => {
    it('shows server error as inline banner when API returns error', async () => {
      mockSignInEmail.mockResolvedValue({
        error: { message: 'Invalid email or password' },
      })

      render(<SignInPage />)

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'user@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'wrongpassword' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeDefined()
      })
    })

    it('shows fallback error message when API throws', async () => {
      mockSignInEmail.mockRejectedValue(new Error('Network error'))

      render(<SignInPage />)

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'user@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeDefined()
      })
    })
  })

  describe('successful submission', () => {
    it('calls authClient.signIn.email with correct credentials', async () => {
      mockSignInEmail.mockResolvedValue({ error: null })

      render(<SignInPage />)

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'user@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(mockSignInEmail).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        })
      })
    })
  })
})
