import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec } from './schema'

export const schema = { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec }

export type Database = ReturnType<typeof drizzle<typeof schema>>

export function createDb(connectionStringOrHyperdrive?: string | { connectionString: string }): Database {
  const connStr = typeof connectionStringOrHyperdrive === 'string'
    ? connectionStringOrHyperdrive
    : connectionStringOrHyperdrive?.connectionString || process.env.DATABASE_URL!
  
  const client = postgres(connStr, {
    max: 5,
    fetch_types: false,
    prepare: true,
  })
  return drizzle(client, { schema })
}

export { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec }
