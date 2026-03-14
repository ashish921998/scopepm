import { pgTable, serial, varchar, timestamp, boolean, index, text, integer, uniqueIndex } from 'drizzle-orm/pg-core'

export const waitlist = pgTable('waitlist', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Better Auth tables
export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: varchar('image', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('session_user_id_idx').on(table.userId),
}))

export const account = pgTable('account', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 100 }).notNull(),
  accessToken: varchar('access_token', { length: 500 }),
  refreshToken: varchar('refresh_token', { length: 500 }),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: varchar('scope', { length: 255 }),
  idToken: varchar('id_token', { length: 2000 }),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('account_user_id_idx').on(table.userId),
}))

export const verification = pgTable('verification', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  identifierIdx: index('verification_identifier_idx').on(table.identifier),
}))

export const userProfile = pgTable('user_profile', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }),
  companyName: varchar('company_name', { length: 255 }),
  teamSize: varchar('team_size', { length: 50 }),
  goals: text('goals'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdUniqueIdx: uniqueIndex('user_profile_user_id_unique_idx').on(table.userId),
}))

export const project = pgTable('project', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('project_user_id_idx').on(table.userId),
}))

// AI Features tables
export const interview = pgTable('interview', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id),
  projectId: integer('project_id').references(() => project.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  transcript: text('transcript').notNull(),
  summary: text('summary'),
  insights: text('insights'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('interview_user_id_idx').on(table.userId),
  projectIdIdx: index('interview_project_id_idx').on(table.projectId),
}))

export const featureSpec = pgTable('feature_spec', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id),
  projectId: integer('project_id').references(() => project.id, { onDelete: 'cascade' }),
  interviewId: integer('interview_id').references(() => interview.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  acceptanceCriteria: text('acceptance_criteria'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('feature_spec_user_id_idx').on(table.userId),
  projectIdIdx: index('feature_spec_project_id_idx').on(table.projectId),
  interviewIdIdx: index('feature_spec_interview_id_idx').on(table.interviewId),
}))

// Types
export type WaitlistEntry = typeof waitlist.$inferSelect
export type NewWaitlistEntry = typeof waitlist.$inferInsert
export type UserProfile = typeof userProfile.$inferSelect
export type NewUserProfile = typeof userProfile.$inferInsert
export type Project = typeof project.$inferSelect
export type NewProject = typeof project.$inferInsert
export type Interview = typeof interview.$inferSelect
export type NewInterview = typeof interview.$inferInsert
export type FeatureSpec = typeof featureSpec.$inferSelect
export type NewFeatureSpec = typeof featureSpec.$inferInsert
