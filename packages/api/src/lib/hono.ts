import type { AuthSession } from '../auth'
import type { Database } from '../db'

export type AppBindings = {
  DATABASE_URL: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  ANTHROPIC_API_KEY: string
  ENVIRONMENT: string
  HYPERDRIVE: { connectionString: string }
}

export type AppVariables = {
  user: AuthSession['user'] | null
  session: AuthSession['session'] | null
  db: Database
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: AppVariables
}
