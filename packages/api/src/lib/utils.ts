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

export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'localhost' ||
    h === '169.254.169.254' ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === '0.0.0.0' ||
    h === '[::1]' ||
    h === '[::]' ||
    /^\[::ffff:/i.test(h) ||
    /^\[f[cd][0-9a-f]{2}:/i.test(h) ||
    /^\[fe80:/i.test(h) ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  )
}
