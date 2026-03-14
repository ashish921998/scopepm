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
