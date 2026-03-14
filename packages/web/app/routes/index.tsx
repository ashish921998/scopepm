import { createFileRoute, Link } from '@tanstack/react-router'
import { Hero } from '../components/Hero'
import { Problem } from '../components/Problem'
import { HowItWorks } from '../components/HowItWorks'
import { Features } from '../components/Features'
import { CTA } from '../components/CTA'
import { Footer } from '../components/Footer'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <nav className="nav">
        <div className="container nav-content">
          <Link to="/" className="logo">Scope</Link>
          <div className="nav-links">
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#features" className="nav-link">Features</a>
            <Link to="/sign-in" className="nav-link">Sign In</Link>
            <Link to="/sign-up" className="btn-secondary">Sign Up</Link>
          </div>
        </div>
      </nav>
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
