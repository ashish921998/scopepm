import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../lib/auth-client'
import { Logo } from '../components/Logo'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const search = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  )
  const token = search.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // No token — show helpful message
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Logo className="auth-logo" />
            <h1 className="auth-title">Invalid reset link</h1>
            <p className="auth-subtitle">
              This password reset link is missing a valid token.
            </p>
          </div>
          <div className="form-success" style={{ marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Please request a new password reset link.
            </p>
            <Link to="/forgot-password" className="btn-primary auth-btn" style={{ textDecoration: 'none' }}>
              Request new link
            </Link>
          </div>
          <div className="auth-switch">
            Remember your password? <Link to="/sign-in" className="form-link">Sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Logo className="auth-logo" />
            <h1 className="auth-title">Password updated</h1>
          </div>
          <div className="form-success">
            <div className="form-success-icon">✓</div>
            <p className="form-success-text">
              Your password has been reset successfully.
            </p>
            <Link to="/sign-in" className="form-link" style={{ marginTop: '1rem' }}>
              Sign in with your new password
            </Link>
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
      const { error: resetError } = await authClient.resetPassword({
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
          <Logo className="auth-logo" />
          <h1 className="auth-title">Set new password</h1>
          <p className="auth-subtitle">Enter and confirm your new password below</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {apiError && (
            <div className="auth-error">
              {apiError}{' '}
              <Link to="/forgot-password" className="form-link">
                Request a new link
              </Link>
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
              <span
                className="field-error"
                style={{
                  fontSize: '0.8125rem',
                  color: '#ef4444',
                  marginTop: '0.25rem',
                }}
              >
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
              <span
                className="field-error"
                style={{
                  fontSize: '0.8125rem',
                  color: '#ef4444',
                  marginTop: '0.25rem',
                }}
              >
                {confirmError}
              </span>
            )}
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-switch">
          Remember your password? <Link to="/sign-in" className="form-link">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
