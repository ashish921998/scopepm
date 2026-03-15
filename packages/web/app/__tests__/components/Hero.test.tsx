import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Hero } from '../../components/Hero'

// Mock TanStack Router's Link to avoid router context requirement
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))

describe('Hero component', () => {
  it('renders the main headline', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
  })

  it('renders the CTA link', () => {
    render(<Hero />)
    const cta = screen.getByText('Get Started Free')
    expect(cta).toBeDefined()
  })
})
