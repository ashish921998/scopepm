import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <Link to="/" className="logo">Scope</Link>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
          <p className="footer-copy">&copy; 2026 Scope. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
