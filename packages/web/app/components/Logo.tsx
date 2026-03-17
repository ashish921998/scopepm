import { Link } from '@tanstack/react-router'

export function Logo({ className = 'logo' }: { className?: string }) {
  return (
    <Link to="/" className={className}>
      <img src="/favicon.svg" alt="Scope" width="22" height="22" />
      Scope
    </Link>
  )
}
