import { createAuthClient } from 'better-auth/react'
import { sentinelClient } from '@better-auth/infra/client'

const BASE_URL = import.meta.env.PROD
  ? 'https://scopepm-api.ashish-hudar.workers.dev'
  : 'http://localhost:3001'

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  plugins: [
    sentinelClient(),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient
