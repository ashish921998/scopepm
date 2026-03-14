import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import '@knadh/oat/oat.min.css'
import '../styles/landing.css'

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontWeight: 400,
            fontSize: '2rem',
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            marginBottom: '2rem',
          }}
        >
          {error.message || 'An unexpected error occurred. Please try again or return home.'}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={reset}
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.625rem 1.25rem',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <Link
            to="/"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-hover)',
              borderRadius: '6px',
              padding: '0.625rem 1.25rem',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

function RootComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}
