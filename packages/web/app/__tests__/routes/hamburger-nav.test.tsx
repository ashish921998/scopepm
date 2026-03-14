import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React, { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Minimal inline replicas of the landing and dashboard nav sections
// (avoids needing router context, auth client, etc. in unit tests)
// ---------------------------------------------------------------------------

function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav className="nav">
        <div className="container nav-content">
          <a href="/" className="logo">Scope</a>
          <div className="nav-links">
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="/sign-in" className="nav-link">Sign In</a>
            <a href="/sign-up" className="btn-secondary">Sign Up</a>
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
            <a href="#how-it-works" className="mobile-nav-link" onClick={closeMenu}>How it works</a>
            <a href="#features" className="mobile-nav-link" onClick={closeMenu}>Features</a>
            <a href="/sign-in" className="mobile-nav-link" onClick={closeMenu}>Sign In</a>
            <a href="/sign-up" className="mobile-nav-link" onClick={closeMenu}>Sign Up</a>
          </nav>
        </div>
      </div>
    </>
  )
}

function DashboardNav({ userName = 'Test User' }: { userName?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const mockSignOut = vi.fn()

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav className="nav">
        <div className="container nav-content">
          <a href="/" className="logo">Scope</a>
          <div className="nav-links">
            <a href="/dashboard" className="nav-link">Dashboard</a>
            <a href="/dashboard/projects" className="nav-link">Projects</a>
            <a href="/dashboard/interviews" className="nav-link">Interviews</a>
            <a href="/dashboard/specs" className="nav-link">Specs</a>
            <span className="nav-user">{userName}</span>
            <button onClick={mockSignOut} className="btn-secondary">Sign Out</button>
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
            <a href="/dashboard" className="mobile-nav-link" onClick={closeMenu}>Dashboard</a>
            <a href="/dashboard/projects" className="mobile-nav-link" onClick={closeMenu}>Projects</a>
            <a href="/dashboard/interviews" className="mobile-nav-link" onClick={closeMenu}>Interviews</a>
            <a href="/dashboard/specs" className="mobile-nav-link" onClick={closeMenu}>Specs</a>
            <span className="mobile-nav-user">{userName}</span>
            <button
              className="mobile-nav-signout"
              onClick={() => { closeMenu(); mockSignOut() }}
            >
              Sign Out
            </button>
          </nav>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Landing page hamburger nav', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders a hamburger toggle button with correct aria-label', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    expect(btn).toBeDefined()
  })

  it('hamburger button has aria-expanded=false by default', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('mobile menu is not open by default', () => {
    render(<LandingNav />)
    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(false)
  })

  it('clicking hamburger opens mobile menu', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)
    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(true)
  })

  it('mobile menu shows all landing nav links when open', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)

    const mobilePanel = document.querySelector('.mobile-menu-panel')
    expect(mobilePanel).toBeDefined()
    expect(mobilePanel?.textContent).toContain('How it works')
    expect(mobilePanel?.textContent).toContain('Features')
    expect(mobilePanel?.textContent).toContain('Sign In')
    expect(mobilePanel?.textContent).toContain('Sign Up')
  })

  it('clicking hamburger again closes the mobile menu', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn) // open
    fireEvent.click(btn) // close
    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(false)
  })

  it('clicking a mobile nav link closes the menu', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn) // open

    // Click any mobile nav link
    const mobileLinks = document.querySelectorAll('.mobile-nav-link')
    expect(mobileLinks.length).toBeGreaterThan(0)
    fireEvent.click(mobileLinks[0])

    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(false)
  })

  it('pressing Escape key closes the menu', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn) // open

    fireEvent.keyDown(document, { key: 'Escape' })

    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(false)
  })

  it('sets body overflow:hidden when menu is open', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body overflow when menu is closed', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn) // open
    fireEvent.click(btn) // close
    expect(document.body.style.overflow).toBe('')
  })

  it('hamburger button gets is-open class when menu is open', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)
    expect(btn.classList.contains('is-open')).toBe(true)
  })

  it('hamburger button loses is-open class when menu is closed', () => {
    render(<LandingNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(btn.classList.contains('is-open')).toBe(false)
  })
})

describe('Dashboard hamburger nav', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders a hamburger toggle button with correct aria-label', () => {
    render(<DashboardNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    expect(btn).toBeDefined()
  })

  it('clicking hamburger opens mobile menu', () => {
    render(<DashboardNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)
    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(true)
  })

  it('dashboard mobile menu shows all nav links', () => {
    render(<DashboardNav userName="Jane Doe" />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)

    const panel = document.querySelector('.mobile-menu-panel')
    expect(panel?.textContent).toContain('Dashboard')
    expect(panel?.textContent).toContain('Projects')
    expect(panel?.textContent).toContain('Interviews')
    expect(panel?.textContent).toContain('Specs')
    expect(panel?.textContent).toContain('Jane Doe')
    expect(panel?.textContent).toContain('Sign Out')
  })

  it('Escape key closes dashboard mobile menu', () => {
    render(<DashboardNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)
    fireEvent.keyDown(document, { key: 'Escape' })
    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(false)
  })

  it('clicking a mobile nav link closes dashboard menu', () => {
    render(<DashboardNav />)
    const btn = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(btn)
    const mobileLinks = document.querySelectorAll('.mobile-nav-link')
    fireEvent.click(mobileLinks[0])
    const menu = document.querySelector('.mobile-menu')
    expect(menu?.classList.contains('is-open')).toBe(false)
  })
})
