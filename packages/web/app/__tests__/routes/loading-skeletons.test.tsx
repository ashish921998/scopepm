import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import {
  Skeleton,
  SkeletonStatCard,
  SkeletonActivityItem,
  SkeletonProjectCard,
  SkeletonInterviewCard,
  SkeletonSpecCard,
} from '../../components/Skeleton'

// Mock TanStack Router (needed for any indirect imports)
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => ({ component: (c: unknown) => c }),
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode
    to: string
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useParams: () => ({ projectId: '1' }),
  useSearch: () => ({}),
}))

describe('Skeleton component', () => {
  it('renders a div with "skeleton" class', () => {
    const { container } = render(<Skeleton />)
    const el = container.querySelector('.skeleton')
    expect(el).not.toBeNull()
  })

  it('applies custom width and height via style', () => {
    const { container } = render(<Skeleton width="120px" height="24px" />)
    const el = container.querySelector('.skeleton') as HTMLElement
    expect(el.style.width).toBe('120px')
    expect(el.style.height).toBe('24px')
  })

  it('applies custom borderRadius', () => {
    const { container } = render(<Skeleton borderRadius="999px" />)
    const el = container.querySelector('.skeleton') as HTMLElement
    expect(el.style.borderRadius).toBe('999px')
  })

  it('merges extra className', () => {
    const { container } = render(<Skeleton className="extra-class" />)
    const el = container.querySelector('.skeleton')
    expect(el?.classList.contains('extra-class')).toBe(true)
  })
})

describe('SkeletonStatCard', () => {
  it('renders inside a stats-card container', () => {
    const { container } = render(<SkeletonStatCard />)
    expect(container.querySelector('.stats-card')).not.toBeNull()
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(2)
  })
})

describe('SkeletonActivityItem', () => {
  it('renders inside an activity-item container', () => {
    const { container } = render(<SkeletonActivityItem />)
    expect(container.querySelector('.activity-item')).not.toBeNull()
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(3)
  })
})

describe('SkeletonProjectCard', () => {
  it('renders inside a project-card container', () => {
    const { container } = render(<SkeletonProjectCard />)
    expect(container.querySelector('.project-card')).not.toBeNull()
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(4)
  })
})

describe('SkeletonInterviewCard', () => {
  it('renders inside an interview-card container', () => {
    const { container } = render(<SkeletonInterviewCard />)
    expect(container.querySelector('.interview-card')).not.toBeNull()
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(5)
  })
})

describe('SkeletonSpecCard', () => {
  it('renders inside a spec-card container', () => {
    const { container } = render(<SkeletonSpecCard />)
    expect(container.querySelector('.spec-card')).not.toBeNull()
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(5)
  })
})

describe('Dashboard loading states — no plain "Loading..." text', () => {
  it('dashboard index skeleton: renders stats cards, activity items, and project cards', () => {
    const { container } = render(
      <>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonActivityItem />
        <SkeletonActivityItem />
        <SkeletonActivityItem />
        <SkeletonProjectCard />
        <SkeletonProjectCard />
        <SkeletonProjectCard />
      </>,
    )

    // Stats cards present
    expect(container.querySelectorAll('.stats-card').length).toBe(4)
    // Activity items present
    expect(container.querySelectorAll('.activity-item').length).toBe(3)
    // Project cards present
    expect(container.querySelectorAll('.project-card').length).toBe(3)
    // All have animated skeleton children
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(10)

    // No "Loading..." text
    expect(screen.queryByText(/Loading dashboard/i)).toBeNull()
  })

  it('no loading text in projects skeleton', () => {
    const { container } = render(
      <div className="project-grid">
        <SkeletonProjectCard />
        <SkeletonProjectCard />
        <SkeletonProjectCard />
      </div>,
    )
    expect(container.querySelectorAll('.project-card').length).toBe(3)
    expect(screen.queryByText(/Loading projects/i)).toBeNull()
  })

  it('no loading text in interviews skeleton', () => {
    const { container } = render(
      <div className="interview-list">
        <SkeletonInterviewCard />
        <SkeletonInterviewCard />
        <SkeletonInterviewCard />
      </div>,
    )
    expect(container.querySelectorAll('.interview-card').length).toBe(3)
    expect(screen.queryByText(/Loading interviews/i)).toBeNull()
  })

  it('no loading text in specs skeleton', () => {
    const { container } = render(
      <div className="spec-list">
        <SkeletonSpecCard />
        <SkeletonSpecCard />
        <SkeletonSpecCard />
      </div>,
    )
    expect(container.querySelectorAll('.spec-card').length).toBe(3)
    expect(screen.queryByText(/Loading specs/i)).toBeNull()
  })

  it('skeleton elements all have the "skeleton" CSS class (for animation)', () => {
    const { container } = render(
      <>
        <SkeletonStatCard />
        <SkeletonInterviewCard />
        <SkeletonSpecCard />
        <SkeletonProjectCard />
      </>,
    )
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
    // Ensure each has the class applied
    skeletons.forEach((el) => {
      expect(el.classList.contains('skeleton')).toBe(true)
    })
  })
})
