import Anthropic from '@anthropic-ai/sdk'

export function getAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey })
}

export const ANALYZE_INTERVIEW_PROMPT = `You are an expert product manager analyzing customer interviews. 

Analyze the following interview transcript and extract:
1. Key pain points and frustrations
2. Feature requests and needs
3. User goals and motivations
4. Quotes that stand out
5. Actionable insights for the product team

Format your response as JSON:
{
  "summary": "Brief 2-3 sentence summary of the interview",
  "painPoints": ["pain point 1", "pain point 2"],
  "featureRequests": ["feature 1", "feature 2"],
  "userGoals": ["goal 1", "goal 2"],
  "notableQuotes": ["quote 1", "quote 2"],
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`

export const GENERATE_SPEC_PROMPT = `You are an expert product manager creating feature specifications.

Based on the provided insights and context, generate a detailed feature specification.

Format your response as JSON:
{
  "title": "Feature title",
  "description": "Detailed description of the feature",
  "acceptanceCriteria": ["criteria 1", "criteria 2", "criteria 3"],
  "userStories": ["As a user, I want to..."],
  "technicalConsiderations": ["consideration 1", "consideration 2"],
  "priority": "high|medium|low",
  "estimatedEffort": "small|medium|large",
  "dependencies": ["dependency 1"],
  "risks": ["risk 1"]
}`

export async function analyzeInterview(client: Anthropic, transcript: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${ANALYZE_INTERVIEW_PROMPT}\n\nInterview Transcript:\n${transcript}`
    }]
  })
  
  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }
  throw new Error('Unexpected response type from Claude')
}

export const ANALYZE_COMPETITOR_PROMPT = `You are a competitive intelligence analyst. Given the text content extracted from a competitor's website, extract structured information about the company.

Format your response as JSON:
{
  "name": "Company or product name",
  "description": "What they do in 1-2 sentences",
  "features": ["key feature 1", "key feature 2", "key feature 3"],
  "pricing": "Summary of pricing tiers and costs, or 'Not available' if not found",
  "positioning": "Who they target and how they differentiate themselves"
}`

export async function analyzeCompetitor(client: Anthropic, websiteText: string): Promise<string> {
  const truncated = websiteText.slice(0, 30000)
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `${ANALYZE_COMPETITOR_PROMPT}\n\nWebsite Text:\n${truncated}`
    }]
  })

  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }
  throw new Error('Unexpected response type from Claude')
}

export const SYNTHESIZE_INTERVIEWS_PROMPT = `You are an expert product manager synthesizing insights across multiple customer interviews.

Given the analyzed insights from multiple interviews, identify patterns and synthesize findings:

1. Cluster related themes across all interviews
2. Rank pain points by frequency (how many interviews mentioned each)
3. Rank feature requests by frequency
4. Identify areas of consensus (themes most interviews agree on) vs. outlier insights (unique to 1-2 interviews)
5. Generate a concise narrative summary of the top patterns

Format your response as JSON:
{
  "themes": [
    {
      "name": "Theme name",
      "description": "Brief description",
      "frequency": 3,
      "interviewIds": [1, 2, 5],
      "relatedQuotes": ["quote 1", "quote 2"]
    }
  ],
  "painPoints": [
    {
      "point": "Description of pain point",
      "frequency": 4,
      "interviewIds": [1, 2, 3, 5]
    }
  ],
  "featureRequests": [
    {
      "request": "Description of feature request",
      "frequency": 2,
      "interviewIds": [2, 4]
    }
  ],
  "consensus": {
    "agreements": ["Things most interviews agree on"],
    "outliers": ["Unique insights from only 1-2 interviews"]
  },
  "summary": "2-3 paragraph narrative summary of top patterns, key takeaways, and recommended next steps"
}`

export const MAX_SYNTHESIS_INTERVIEWS = 20

export async function synthesizeInterviews(
  client: Anthropic,
  interviewInsights: Array<{ id: number; title: string; insights: string }>
): Promise<string> {
  const capped = interviewInsights.slice(0, MAX_SYNTHESIS_INTERVIEWS)
  const formattedInsights = capped
    .map((i) => `--- Interview #${i.id}: "${i.title}" ---\n${i.insights}`)
    .join('\n\n')

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${SYNTHESIZE_INTERVIEWS_PROMPT}\n\nTotal interviews: ${capped.length}\n\n${formattedInsights}`
    }]
  })

  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }
  throw new Error('Unexpected response type from Claude')
}

export async function generateFeatureSpec(
  client: Anthropic, 
  insights: string, 
  context?: string
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${GENERATE_SPEC_PROMPT}\n\nInsights:\n${insights}\n\n${context ? `Additional Context:\n${context}` : ''}`
    }]
  })
  
  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }
  throw new Error('Unexpected response type from Claude')
}
