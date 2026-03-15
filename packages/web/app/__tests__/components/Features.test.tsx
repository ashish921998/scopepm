import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Features } from '../../components/Features'

describe('Features component', () => {
  it('renders the section title', () => {
    render(<Features />)
    expect(screen.getByText('Everything You Need')).toBeDefined()
  })

  it('renders feature cards', () => {
    render(<Features />)
    const cards = document.querySelectorAll('.feature-card')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('renders Interview Analysis feature card', () => {
    render(<Features />)
    expect(screen.getByText('Interview Analysis')).toBeDefined()
  })

  it('renders Prioritization Engine feature card', () => {
    render(<Features />)
    expect(screen.getByText('Prioritization Engine')).toBeDefined()
  })

  it('shows Coming Soon badges for unbuilt features', () => {
    render(<Features />)
    const comingSoonBadges = screen.getAllByText('Coming Soon')
    expect(comingSoonBadges.length).toBe(4)
  })

  it('does not show Coming Soon for Interview Analysis', () => {
    render(<Features />)
    const interviewCard = screen.getByText('Interview Analysis').closest('.feature-card')
    expect(interviewCard?.classList.contains('feature-card--coming-soon')).toBe(false)
  })

  it('does not show Coming Soon for Task Breakdown', () => {
    render(<Features />)
    const taskCard = screen.getByText('Task Breakdown').closest('.feature-card')
    expect(taskCard?.classList.contains('feature-card--coming-soon')).toBe(false)
  })
})
