import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: 'http://localhost:3000/reset-password',
      })

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link to="/" className="auth-logo">Scope</Link>
            <h1 className="auth-title">Check your email</h1>
          </div>
          <div className="form-success">
            <div className="form-success-icon">✓</div>
            <p className="form-success-text">
              If an account exists for {email}, we've sent a password reset link.
            </p>
            <Link to="/sign-in" className="form-link">Back to sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">Scope</Link>
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-switch">
          Remember your password? <Link to="/sign-in" className="form-link">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
