export function Features() {
  const features = [
    {
      icon: '🎙️',
      title: 'Interview Analysis',
      description: 'Upload customer interviews and let AI extract key themes, pain points, and feature requests automatically.',
    },
    {
      icon: '📊',
      title: 'Market Synthesis',
      description: 'Combine user feedback with market research to understand where opportunities lie.',
    },
    {
      icon: '🎨',
      title: 'UI Proposals',
      description: 'Get mockups and wireframe suggestions based on user needs, not designer assumptions.',
    },
    {
      icon: '📋',
      title: 'Task Breakdown',
      description: 'Features are broken into implementable tasks with acceptance criteria, ready for your coding agent.',
    },
    {
      icon: '🔄',
      title: 'Feedback Loops',
      description: 'Track which features ship and close the loop by measuring impact on user satisfaction.',
    },
    {
      icon: '🎯',
      title: 'Prioritization Engine',
      description: 'AI ranks features by impact and effort, so you always know what to build next.',
    },
  ]

  return (
    <section id="features" className="features-section">
      <div className="container">
        <h2 className="section-title">Everything You Need</h2>
        <p className="section-subtitle">
          The complete toolkit for AI-native product discovery.
        </p>
        <div className="features-grid">
          {features.map((feature) => (
            <article key={feature.title} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
