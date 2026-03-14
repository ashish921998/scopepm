import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (_opts: unknown) => ({}),
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))

// Mock auth client
const mockRequestPasswordReset = vi.fn()
vi.mock('../../lib/auth-client', () => ({
  authClient: {
    requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
  },
}))

// Import after mocks are set up
import { ForgotPasswordPage } from '../../routes/forgot-password'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockRequestPasswordReset.mockReset()
  })

  it('renders the forgot password form', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeDefined()
  })

  it('uses window.location.origin for redirectTo URL', async () => {
    mockRequestPasswordReset.mockResolvedValue({ error: null })

    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith({
        email: 'user@example.com',
        redirectTo: `${window.location.origin}/reset-password`,
      })
    })
  })

  it('uses dynamic window.location.origin (not hardcoded) for redirectTo', async () => {
    mockRequestPasswordReset.mockResolvedValue({ error: null })

    // Override window.location.origin to simulate a production environment
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://app.example.com' },
      configurable: true,
    })

    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalled()
      const callArgs = mockRequestPasswordReset.mock.calls[0][0]
      expect(callArgs.redirectTo).toBe('https://app.example.com/reset-password')
    })

    // Restore
    Object.defineProperty(window, 'location', {
      value: window.location,
      configurable: true,
    })
  })

  it('shows success state after successful submission', async () => {
    mockRequestPasswordReset.mockResolvedValue({ error: null })

    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeDefined()
    })
  })

  it('shows error when API returns an error', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      error: { message: 'User not found' },
    })

    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeDefined()
    })
  })
})
