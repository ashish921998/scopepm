export function parseJsonFromText(text: string): Record<string, unknown> {
  // Find the first '{' and try progressively shorter substrings ending at each '}'
  const start = text.indexOf('{')
  if (start === -1) return {}

  for (let end = text.lastIndexOf('}'); end > start; end = text.lastIndexOf('}', end - 1)) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      // Try a shorter substring
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
