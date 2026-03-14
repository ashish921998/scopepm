# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Required Environment Variables (packages/api/.env)

- `DATABASE_URL` - PlanetScale PostgreSQL connection string (postgresql://...)
- `DATABASE_PASSWORD` - PlanetScale database password
- `BETTER_AUTH_SECRET` - Secret key for Better Auth session signing
- `BETTER_AUTH_URL` - Base URL for Better Auth (https://scopepm-api.ashish-hudar.workers.dev)
- `ANTHROPIC_API_KEY` - Anthropic API key (EMPTY - AI features non-functional)

## Runtime

- Bun 1.2.22 (primary runtime)
- Node compatibility via Bun
- Deploys to Cloudflare Workers (API) and Cloudflare Pages (Web)

## Database

- Remote PlanetScale PostgreSQL (not local)
- ORM: Drizzle with postgres driver
- Migrations: drizzle-kit (db:push for dev, db:generate + db:migrate for production)
