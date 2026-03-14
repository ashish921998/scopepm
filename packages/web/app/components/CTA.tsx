import { Link } from '@tanstack/react-router'

export function CTA() {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-content">
          <h2 className="section-title">Ready to build what matters?</h2>
          <p className="section-subtitle" style={{ margin: '0 auto 2rem' }}>
            Start capturing interviews, generating specs, and shipping features faster.
          </p>
          <Link to="/sign-up" className="btn-primary">
            Get Started Free
          </Link>
        </div>
      </div>
    </section>
  )
}
