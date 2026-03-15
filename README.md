# Scopepm

AI-native product management tool built as a monorepo with a Hono API backend and React frontend.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **API:** [Hono](https://hono.dev) (Cloudflare Workers), [Better Auth](https://www.better-auth.com), [Drizzle ORM](https://orm.drizzle.team), PostgreSQL
- **AI:** [Anthropic Claude](https://www.anthropic.com)
- **Web:** [React 19](https://react.dev), [Vite](https://vite.dev), [TanStack Router](https://tanstack.com/router), [TanStack Query](https://tanstack.com/query)
- **Testing:** [Vitest](https://vitest.dev), [React Testing Library](https://testing-library.com)
- **Deploy:** [Cloudflare Workers](https://workers.cloudflare.com) (API) + [Cloudflare Pages](https://pages.cloudflare.com) (Web)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest)
- PostgreSQL database

### Install

```bash
bun install
```

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp packages/api/.env.example packages/api/.env
```

Required environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth secret key (min 32 characters) |
| `BETTER_AUTH_URL` | Auth base URL (e.g. `http://localhost:3001`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |

### Database Setup

```bash
bun run db:generate   # Generate migrations
bun run db:push       # Push schema to database
```

### Running Dev Servers

```bash
bun run dev           # Start both API (port 3001) and web (port 3000)
bun run dev:api       # Start API only
bun run dev:web       # Start web only
```

## Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start all dev servers |
| `bun run dev:api` | Start API server (port 3001) |
| `bun run dev:web` | Start web server (port 3000) |
| `bun run build` | Build all packages |
| `bun run test` | Run all tests |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:push` | Push schema to database |

## Project Structure

```
scopepm/
├── packages/
│   ├── api/                # Hono backend
│   │   ├── src/
│   │   │   ├── db/         # Drizzle schema & database
│   │   │   ├── routes/     # API route handlers
│   │   │   ├── lib/        # Shared utilities
│   │   │   ├── auth.ts     # Better Auth configuration
│   │   │   └── index.ts    # App entry point
│   │   └── drizzle.config.ts
│   └── web/                # React frontend
│       ├── app/
│       │   ├── components/ # UI components
│       │   ├── routes/     # TanStack Router pages
│       │   ├── lib/        # Client utilities
│       │   └── styles/     # CSS design system
│       └── index.html
├── package.json            # Root workspace config
└── tsconfig.json           # Shared TypeScript config
```

## Testing

The project has 264 tests across both packages using Vitest:

```bash
bun run test              # Run all tests (API + web)
```

Per-package:

```bash
cd packages/api && bun run test         # API tests
cd packages/web && bun run test         # Web tests (jsdom)
cd packages/api && bun run test:watch   # API watch mode
cd packages/web && bun run test:watch   # Web watch mode
```
