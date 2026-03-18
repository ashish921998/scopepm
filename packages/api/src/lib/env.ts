import type { AppBindings } from './hono'

type EnvSource = Partial<AppBindings> & Record<string, unknown>

const REQUIRED_VARS = ['BETTER_AUTH_SECRET'] as const

export function validateEnv(env: EnvSource, isLocal: boolean): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (isLocal) {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required (set in .env or environment)')
    }
    if (!process.env.BETTER_AUTH_SECRET) {
      errors.push('BETTER_AUTH_SECRET is required (set in .env or environment)')
    }
  } else {
    if (!env.HYPERDRIVE) {
      errors.push('HYPERDRIVE binding is required in production (configure in wrangler.toml)')
    }
    for (const key of REQUIRED_VARS) {
      if (!env[key]) {
        errors.push(`${key} is required (set in wrangler.toml [vars] or as a secret)`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
