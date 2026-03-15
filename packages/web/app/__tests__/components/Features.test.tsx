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
})
