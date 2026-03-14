export function parseJsonFromText(text: string): Record<string, unknown> {
  // Try to extract JSON from the text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      // Fall through to return empty object
    }
  }
  return {}
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getUserId(user: { id: string }): number {
  return Number.parseInt(user.id, 10)
}

export function parseInteger(value: string | undefined | null): number | null {
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}
