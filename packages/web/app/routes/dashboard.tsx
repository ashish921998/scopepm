import { createFileRoute, useNavigate, Link, Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession, signOut } from '../lib/auth-client'
import { apiFetch } from '../lib/api'

type OnboardingStatus = {
  onboardingCompleted: boolean
}

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')

  useEffect(() => {
    if (isPending) return

    if (!session) {
      navigate({ to: '/sign-in' })
      return
    }

    const loadOnboarding = async () => {
      try {
        const data = await apiFetch<OnboardingStatus>('/api/onboarding/status')
        setOnboardingCompleted(data.onboardingCompleted)

        if (!data.onboardingCompleted) {
          navigate({ to: '/onboarding' })
        }
      } catch (err) {
        setOnboardingError(err instanceof Error ? err.message : 'Failed to load onboarding status')
      } finally {
        setCheckingOnboarding(false)
      }
    }

    void loadOnboarding()
  }, [session, isPending, navigate])

  if (isPending || checkingOnboarding) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <p className="auth-subtitle">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !onboardingCompleted) {
    if (onboardingError) {
      return (
        <div className="auth-page">
          <div className="auth-container">
            <div className="auth-error">{onboardingError}</div>
          </div>
        </div>
      )
    }

    return null
  }

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="dashboard-page">
      <nav className="nav">
        <div className="container nav-content">
          <Link to="/" className="logo">Scope</Link>
          <div className="nav-links">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/dashboard/projects" className="nav-link">Projects</Link>
            <Link to="/dashboard/interviews" className="nav-link">Interviews</Link>
            <Link to="/dashboard/specs" className="nav-link">Specs</Link>
            <span className="nav-user">{session.user.name || session.user.email}</span>
            <button onClick={handleSignOut} className="btn-secondary">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <p className="footer-copy">© 2026 Scope. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
