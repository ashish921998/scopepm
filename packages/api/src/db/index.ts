import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec } from './schema'

export const schema = { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec }

export type Database = PostgresJsDatabase<typeof schema>

export function createDb(connectionStringOrHyperdrive?: string | { connectionString: string }): Database {
  const connStr = typeof connectionStringOrHyperdrive === 'string'
    ? connectionStringOrHyperdrive
    : connectionStringOrHyperdrive?.connectionString || process.env.DATABASE_URL!
  const client = postgres(connStr, { prepare: false })
  return drizzle(client, { schema })
}

export { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec }
