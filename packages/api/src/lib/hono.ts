import type { AuthSession } from '../auth'

export type AppBindings = {
  DATABASE_URL: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  ANTHROPIC_API_KEY: string
  ENVIRONMENT: string
}

export type AppVariables = {
  user: AuthSession['user'] | null
  session: AuthSession['session'] | null
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: AppVariables
}
