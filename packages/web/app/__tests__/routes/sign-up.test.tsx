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
const mockSignUpEmail = vi.fn()
vi.mock('../../lib/auth-client', () => ({
  authClient: {
    signUp: {
      email: (...args: unknown[]) => mockSignUpEmail(...args),
    },
  },
}))

// Import after mocks
import { SignUpPage } from '../../routes/sign-up'

describe('SignUpPage', () => {
  beforeEach(() => {
    mockSignUpEmail.mockReset()
  })

  it('renders the sign-up form', () => {
    render(<SignUpPage />)
    expect(screen.getByLabelText('Name')).toBeDefined()
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDefined()
  })

  describe('inline field validation', () => {
    it('shows field-error for empty name on submit', async () => {
      render(<SignUpPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeDefined()
      })

      expect(mockSignUpEmail).not.toHaveBeenCalled()
    })

    it('shows field-error for empty email on submit', async () => {
      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeDefined()
      })

      expect(mockSignUpEmail).not.toHaveBeenCalled()
    })

    it('shows field-error for invalid email format', async () => {
      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'not-valid' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeDefined()
      })

      expect(mockSignUpEmail).not.toHaveBeenCalled()
    })

    it('shows field-error for password shorter than 8 characters', async () => {
      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'alice@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'short' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeDefined()
      })

      expect(mockSignUpEmail).not.toHaveBeenCalled()
    })

    it('shows field-error for empty password on submit', async () => {
      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'alice@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeDefined()
      })

      expect(mockSignUpEmail).not.toHaveBeenCalled()
    })

    it('shows all errors simultaneously when all fields invalid', async () => {
      render(<SignUpPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeDefined()
        expect(screen.getByText('Email is required')).toBeDefined()
        expect(screen.getByText('Password is required')).toBeDefined()
      })

      expect(mockSignUpEmail).not.toHaveBeenCalled()
    })

    it('error elements have class field-error', async () => {
      render(<SignUpPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        const fieldErrors = document.querySelectorAll('.field-error')
        expect(fieldErrors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('submit button loading state', () => {
    it('disables button and shows loading text during API request', async () => {
      mockSignUpEmail.mockImplementation(() => new Promise(() => {}))

      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'alice@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        const btn = screen.getByRole('button', {
          name: 'Creating account...',
        }) as HTMLButtonElement
        expect(btn).toBeDefined()
        expect(btn.disabled).toBe(true)
      })
    })
  })

  describe('server error display', () => {
    it('shows server error as inline banner when API returns error', async () => {
      mockSignUpEmail.mockResolvedValue({
        error: { message: 'Email already in use' },
      })

      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'alice@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Email already in use')).toBeDefined()
      })
    })

    it('shows fallback error message when API throws', async () => {
      mockSignUpEmail.mockRejectedValue(new Error('Network error'))

      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'alice@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeDefined()
      })
    })
  })

  describe('successful submission', () => {
    it('calls authClient.signUp.email with correct credentials', async () => {
      mockSignUpEmail.mockResolvedValue({ error: null })

      render(<SignUpPage />)

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Alice' },
      })
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'alice@example.com' },
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(mockSignUpEmail).toHaveBeenCalledWith({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice',
          callbackURL: '/dashboard',
        })
      })
    })
  })
})
