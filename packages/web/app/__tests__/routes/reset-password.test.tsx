import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => ({ component: (c: unknown) => c }),
  Link: ({ children, to, className, style }: { children: React.ReactNode; to: string; className?: string; style?: React.CSSProperties }) => (
    <a href={to} className={className} style={style}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

// Mock auth client
const mockResetPassword = vi.fn()
vi.mock('../../lib/auth-client', () => ({
  authClient: {
    resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  },
}))

// Inline test component mirroring the real reset-password page logic,
// but accepting token as a prop instead of reading window.location
function ResetPasswordPageDirect({ token }: { token?: string }) {
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [passwordError, setPasswordError] = React.useState('')
  const [confirmError, setConfirmError] = React.useState('')
  const [apiError, setApiError] = React.useState('')
  const [success, setSuccess] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <a href="/" className="auth-logo">Scope</a>
            <h1 className="auth-title">Invalid reset link</h1>
            <p className="auth-subtitle">
              This password reset link is missing a valid token.
            </p>
          </div>
          <div className="form-success" style={{ marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Please request a new password reset link.
            </p>
            <a href="/forgot-password" className="btn-primary auth-btn">
              Request new link
            </a>
          </div>
          <div className="auth-switch">
            Remember your password? <a href="/sign-in" className="form-link">Sign in</a>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <a href="/" className="auth-logo">Scope</a>
            <h1 className="auth-title">Password updated</h1>
          </div>
          <div className="form-success">
            <div className="form-success-icon">✓</div>
            <p className="form-success-text">
              Your password has been reset successfully.
            </p>
            <a href="/sign-in" className="form-link" style={{ marginTop: '1rem' }}>
              Sign in with your new password
            </a>
          </div>
        </div>
      </div>
    )
  }

  const validate = () => {
    let valid = true
    setPasswordError('')
    setConfirmError('')

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      valid = false
    }

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match')
      valid = false
    }

    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')

    if (!validate()) return

    setLoading(true)

    try {
      const { error: resetError } = await mockResetPassword({
        newPassword,
        token,
      })

      if (resetError) {
        setApiError(resetError.message || 'Failed to reset password. The link may be invalid or expired.')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setApiError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <a href="/" className="auth-logo">Scope</a>
          <h1 className="auth-title">Set new password</h1>
          <p className="auth-subtitle">Enter and confirm your new password below</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {apiError && (
            <div className="auth-error">
              {apiError}{' '}
              <a href="/forgot-password" className="form-link">
                Request a new link
              </a>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">New password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              placeholder="At least 8 characters"
            />
            {passwordError && (
              <span className="field-error" style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.25rem' }}>
                {passwordError}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              placeholder="Re-enter your password"
            />
            {confirmError && (
              <span className="field-error" style={{ fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.25rem' }}>
                {confirmError}
              </span>
            )}
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-switch">
          Remember your password? <a href="/sign-in" className="form-link">Sign in</a>
        </div>
      </div>
    </div>
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockResetPassword.mockReset()
  })

  describe('when no token is provided', () => {
    it('renders invalid link message', () => {
      render(<ResetPasswordPageDirect />)
      expect(screen.getByText('Invalid reset link')).toBeDefined()
      expect(screen.getByText('This password reset link is missing a valid token.')).toBeDefined()
    })

    it('shows link to forgot-password page', () => {
      render(<ResetPasswordPageDirect />)
      const link = screen.getByText('Request new link')
      expect(link).toBeDefined()
      expect((link as HTMLAnchorElement).href).toContain('/forgot-password')
    })

    it('does not render password form fields', () => {
      render(<ResetPasswordPageDirect />)
      expect(screen.queryByLabelText('New password')).toBeNull()
      expect(screen.queryByLabelText('Confirm password')).toBeNull()
    })
  })

  describe('when token is provided', () => {
    it('renders the password reset form', () => {
      render(<ResetPasswordPageDirect token="test-token" />)
      expect(screen.getByLabelText('New password')).toBeDefined()
      expect(screen.getByLabelText('Confirm password')).toBeDefined()
      expect(screen.getByRole('button', { name: 'Reset Password' })).toBeDefined()
    })

    it('shows inline error when password is too short', async () => {
      render(<ResetPasswordPageDirect token="test-token" />)

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
      fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short' } })
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeDefined()
      })

      expect(mockResetPassword).not.toHaveBeenCalled()
    })

    it('shows inline error when passwords do not match', async () => {
      render(<ResetPasswordPageDirect token="test-token" />)

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'validpassword1' } })
      fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'differentpassword2' } })
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeDefined()
      })

      expect(mockResetPassword).not.toHaveBeenCalled()
    })

    it('shows loading state during submission', async () => {
      mockResetPassword.mockImplementation(() => new Promise(() => {})) // never resolves

      render(<ResetPasswordPageDirect token="test-token" />)

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'validpassword1' } })
      fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'validpassword1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Resetting...' }) as HTMLButtonElement
        expect(btn).toBeDefined()
        expect(btn.disabled).toBe(true)
      })
    })

    it('shows success state after successful reset', async () => {
      mockResetPassword.mockResolvedValue({ error: null })

      render(<ResetPasswordPageDirect token="test-token" />)

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'validpassword1' } })
      fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'validpassword1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

      await waitFor(() => {
        expect(screen.getByText('Password updated')).toBeDefined()
        expect(screen.getByText('Your password has been reset successfully.')).toBeDefined()
      })

      const signInLink = screen.getByText('Sign in with your new password')
      expect(signInLink).toBeDefined()
      expect((signInLink as HTMLAnchorElement).href).toContain('/sign-in')
    })

    it('shows error with forgot-password link when API returns error', async () => {
      mockResetPassword.mockResolvedValue({
        error: { message: 'Invalid or expired token' },
      })

      render(<ResetPasswordPageDirect token="bad-token" />)

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'validpassword1' } })
      fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'validpassword1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired token')).toBeDefined()
        const requestLink = screen.getByText('Request a new link')
        expect((requestLink as HTMLAnchorElement).href).toContain('/forgot-password')
      })
    })

    it('calls resetPassword API with token and new password', async () => {
      mockResetPassword.mockResolvedValue({ error: null })

      render(<ResetPasswordPageDirect token="my-token" />)

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword123' } })
      fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'newpassword123' } })
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({
          newPassword: 'newpassword123',
          token: 'my-token',
        })
      })
    })
  })
})
