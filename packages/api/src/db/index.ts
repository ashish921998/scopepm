import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec } from './schema'

// PlanetScale Postgres connection
const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, { prepare: false })

export const db = drizzle(client, { schema: { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec } })

export { waitlist, user, session, account, verification, userProfile, project, interview, featureSpec }
