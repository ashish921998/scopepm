import { createAuthClient } from 'better-auth/react'
import { sentinelClient } from '@better-auth/infra/client'
import { API_URL } from './api'

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    sentinelClient(),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient
