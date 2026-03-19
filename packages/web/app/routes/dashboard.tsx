import { createFileRoute, useNavigate, Link, Outlet } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from '../lib/auth-client'
import { apiFetch } from '../lib/api'
import { Logo } from '../components/Logo'

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
  const [menuOpen, setMenuOpen] = useState(false)
  // ref used to avoid stale closure in event listener
  const menuOpenRef = useRef(menuOpen)

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

  useEffect(() => {
    menuOpenRef.current = menuOpen
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpenRef.current) setMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Reset scroll lock when viewport expands past mobile breakpoint
  useEffect(() => {
    if (!menuOpen) return

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false)
        document.body.style.overflow = ''
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [menuOpen])

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

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="dashboard-page">
      <nav className="nav">
        <div className="container nav-content">
          <Logo />
          <div className="nav-links">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/dashboard/projects" className="nav-link">Projects</Link>
            <Link to="/dashboard/interviews" className="nav-link">Interviews</Link>
            <Link to="/dashboard/specs" className="nav-link">Specs</Link>
            <Link to="/dashboard/competitors" className="nav-link">Competitors</Link>
            <span className="nav-user">{session.user.name || session.user.email}</span>
            <button onClick={handleSignOut} className="btn-secondary">
              Sign Out
            </button>
          </div>
          <button
            className={`hamburger-btn${menuOpen ? ' is-open' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
          </button>
        </div>
      </nav>

      <div
        className={`mobile-menu${menuOpen ? ' is-open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) closeMenu() }}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu-panel">
          <nav className="mobile-nav-links">
            <Link to="/dashboard" className="mobile-nav-link" onClick={closeMenu}>Dashboard</Link>
            <Link to="/dashboard/projects" className="mobile-nav-link" onClick={closeMenu}>Projects</Link>
            <Link to="/dashboard/interviews" className="mobile-nav-link" onClick={closeMenu}>Interviews</Link>
            <Link to="/dashboard/specs" className="mobile-nav-link" onClick={closeMenu}>Specs</Link>
            <Link to="/dashboard/competitors" className="mobile-nav-link" onClick={closeMenu}>Competitors</Link>
            <span className="mobile-nav-user">{session.user.name || session.user.email}</span>
            <button
              className="mobile-nav-signout"
              onClick={() => { closeMenu(); void handleSignOut() }}
            >
              Sign Out
            </button>
          </nav>
        </div>
      </div>

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
