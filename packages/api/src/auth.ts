import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { dash } from '@better-auth/infra'
import type { Database } from './db'
import { user, session, account, verification } from './db/schema'
import { logger } from './lib/logger'

type AuthOptions = {
  secret?: string
  baseURL?: string
}

function maskEmail(email: string): string {
  const [localPart = '', domain = 'unknown'] = email.split('@')
  const visiblePrefix = localPart.slice(0, 2)
  return `${visiblePrefix}${localPart.length > 2 ? '***' : ''}@${domain}`
}

export function createAuth(db: Database, options?: AuthOptions) {
  return betterAuth({
    secret: options?.secret || process.env.BETTER_AUTH_SECRET,
    baseURL: options?.baseURL || process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: user,
        session: session,
        account: account,
        verification: verification,
      },
    }),
    user: {
      modelName: 'user',
    },
    session: {
      modelName: 'session',
    },
    account: {
      modelName: 'account',
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }: { user: { email: string }, url: string }) => {
        const [, emailDomain = 'unknown'] = user.email.split('@')
        logger.info('Password reset requested', {
          maskedEmail: maskEmail(user.email),
          emailDomain,
        })
      },
    },
    advanced: {
      database: {
        generateId: false,
      },
    },
    trustedOrigins: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://scopepm.pages.dev',
      'https://scopepm-web.pages.dev',
      'https://scopepm-api.ashish-hudar.workers.dev',
      'https://*.scopepm.pages.dev',
      'https://*.scopepm-web.pages.dev',
    ],
    plugins: [
      dash(),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
export type AuthSession = Auth['$Infer']['Session']
