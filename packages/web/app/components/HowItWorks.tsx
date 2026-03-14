export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Upload Your Data',
      description: 'Drop in customer interviews, support tickets, product usage data, competitor research, and any feedback you\'ve collected.',
    },
    {
      number: '02',
      title: 'AI Synthesizes Insights',
      description: 'Our AI analyzes patterns across all your data, identifying pain points, opportunities, and what users actually need.',
    },
    {
      number: '03',
      title: 'Get Build-Ready Specs',
      description: 'Receive prioritized feature recommendations with detailed specs, UI proposals, and task breakdowns ready for your coding agent.',
    },
  ]

  return (
    <section id="how-it-works">
      <div className="container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          From scattered feedback to clear direction in minutes, not weeks.
        </p>
        <div className="how-it-works-grid">
          {steps.map((step) => (
            <article key={step.number} className="step-card">
              <span className="step-number">{step.number}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
