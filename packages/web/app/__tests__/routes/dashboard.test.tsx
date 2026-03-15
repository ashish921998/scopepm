import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Use vi.hoisted() so these variables are available inside vi.mock() factories
// ---------------------------------------------------------------------------
const { mockNavigate, mockUseSession, mockSignOut } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseSession: vi.fn(),
  mockSignOut: vi.fn(),
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  Outlet: () => <div data-testid="outlet" />,
}))

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
  API_URL: '',
}))

// ---------------------------------------------------------------------------
// Mock auth-client with a controllable useSession function
// ---------------------------------------------------------------------------
vi.mock('../../lib/auth-client', () => ({
  useSession: () => mockUseSession(),
  signOut: mockSignOut,
}))

// Import dashboard route after mocks are set up (vi.mock is hoisted)
import { Route } from '../../routes/dashboard'
const DashboardLayout = (Route as unknown as { component: React.ComponentType }).component

describe('DashboardLayout auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in when session is null and not pending', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })

    render(<DashboardLayout />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in' })
    })
  })

  it('shows loading state and does not redirect when isPending is true', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })

    render(<DashboardLayout />)

    // Loading text should be visible
    expect(screen.getByText('Loading...')).toBeDefined()
    // Navigation must NOT be triggered while loading
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
