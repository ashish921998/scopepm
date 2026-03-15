import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { Database } from './db'
import { user, session, account, verification } from './db/schema'

type AuthOptions = {
  secret?: string
  baseURL?: string
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
        console.log('Password reset URL:', url)
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
      'https://scopepm-web.pages.dev',
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
export type AuthSession = Auth['$Infer']['Session']
