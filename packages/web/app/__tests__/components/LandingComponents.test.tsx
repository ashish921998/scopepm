import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { HowItWorks } from '../../components/HowItWorks'
import { Problem } from '../../components/Problem'
import { CTA } from '../../components/CTA'
import { Footer } from '../../components/Footer'

// Mock TanStack Router's Link to avoid router context requirement
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))

describe('HowItWorks component', () => {
  it('renders the section heading', () => {
    render(<HowItWorks />)
    expect(screen.getByText('How It Works')).toBeDefined()
  })

  it('renders step cards', () => {
    render(<HowItWorks />)
    const stepCards = document.querySelectorAll('.step-card')
    expect(stepCards.length).toBeGreaterThan(0)
  })
})

describe('Problem component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Problem />)
    expect(container.firstChild).toBeDefined()
  })

  it('renders the problem section', () => {
    render(<Problem />)
    const section = document.querySelector('.problem-section')
    expect(section).not.toBeNull()
  })
})

describe('CTA component', () => {
  it('renders the section heading', () => {
    render(<CTA />)
    expect(screen.getByText('Ready to build what matters?')).toBeDefined()
  })

  it('renders the Get Started Free link', () => {
    render(<CTA />)
    expect(screen.getByText('Get Started Free')).toBeDefined()
  })
})

describe('Footer component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Footer />)
    expect(container.firstChild).toBeDefined()
  })

  it('renders the Scope logo link', () => {
    render(<Footer />)
    expect(screen.getByText('Scope')).toBeDefined()
  })
})
