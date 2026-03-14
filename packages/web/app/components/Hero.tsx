import { Link } from '@tanstack/react-router'

export function Hero() {
  return (
    <section className="hero">
      <div className="dot-grid"></div>
      <div className="hero-landscape">
        <img src="/images/landscape.svg" alt="" />
      </div>
      <div className="container hero-content">
        <span className="hero-tagline">AI-Native Product Management</span>
        <h1 className="hero-headline">
          Stop guessing <em>what</em> to build
        </h1>
        <p className="hero-subheadline">
          Turn customer interviews into actionable specs. Know exactly what to build.
        </p>
        <Link to="/sign-up" className="btn-primary hero-cta">
          Get Started Free
        </Link>
      </div>
    </section>
  )
}
