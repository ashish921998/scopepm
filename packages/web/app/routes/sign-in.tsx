import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../lib/auth-client'
import { validateSignIn, hasNoErrors, type SignInErrors } from '../lib/validation'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

export function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<SignInErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

    const errors = validateSignIn(email, password)
    setFieldErrors(errors)
    if (!hasNoErrors(errors)) return

    setLoading(true)

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: '/dashboard',
      })

      if (signInError) {
        setServerError(signInError.message || 'Failed to sign in')
        setLoading(false)
        return
      }

      navigate({ to: '/dashboard' })
    } catch (err) {
      setServerError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">Scope</Link>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="auth-error">{serverError}</div>}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span className="field-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="password-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-input password-input${fieldErrors.password ? ' form-input--error' : ''}`}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="field-error">{fieldErrors.password}</span>
            )}
          </div>

          <div className="form-footer">
            <Link to="/forgot-password" className="form-link">Forgot password?</Link>
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/sign-up" className="form-link">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
