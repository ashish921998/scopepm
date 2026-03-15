import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import { user, session, account, verification } from './db/schema'

export const auth = betterAuth({
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

export type AuthSession = typeof auth.$Infer.Session
