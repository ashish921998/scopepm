import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../lib/auth-client'
import { validateSignUp, hasNoErrors, type SignUpErrors } from '../lib/validation'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
})

export function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<SignUpErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

    const errors = validateSignUp(name, email, password)
    setFieldErrors(errors)
    if (!hasNoErrors(errors)) return

    setLoading(true)

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: '/dashboard',
      })

      if (signUpError) {
        setServerError(signUpError.message || 'Failed to create account')
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
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join Scope to transform your product management workflow</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="auth-error">{serverError}</div>}

          <div className="form-group">
            <label htmlFor="name" className="form-label">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`form-input${fieldErrors.name ? ' form-input--error' : ''}`}
              placeholder="Your name"
              autoComplete="name"
            />
            {fieldErrors.name && (
              <span className="field-error">{fieldErrors.name}</span>
            )}
          </div>

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
                placeholder="Create a password (min 8 characters)"
                autoComplete="new-password"
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

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/sign-in" className="form-link">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
