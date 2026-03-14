# Architecture

Architectural decisions, patterns, and codebase structure.

**What belongs here:** High-level architecture, module boundaries, data flow patterns, design decisions.

---

## Monorepo Structure

```
scopepm/
├── packages/api/     # Hono backend (Bun + Cloudflare Workers)
│   ├── src/
│   │   ├── auth.ts        # Better Auth config
│   │   ├── index.ts       # App entry, middleware, route mounting
│   │   ├── db/            # Drizzle schema and connection
│   │   ├── lib/           # Utilities, Anthropic client, Hono types
│   │   └── routes/        # Route handlers (waitlist, interviews, specs, onboarding, projects)
│   └── .env               # Environment variables (not committed)
├── packages/web/     # React frontend (Vite + Cloudflare Pages)
│   ├── app/
│   │   ├── routes/        # TanStack Router file-based routes
│   │   ├── components/    # Landing page components
│   │   ├── lib/           # API client, auth client
│   │   └── styles/        # CSS files
│   └── index.html
└── .factory/         # Mission infrastructure
```

## API Patterns

- Route files export Hono routers mounted in index.ts
- Session middleware runs globally, attaches user/session to context
- Protected routes check `c.get('user')` for null
- Ownership checks compare userId from record to authenticated user

## Web Patterns

- TanStack Router with file-based routing
- Auth: Better Auth React client with useSession hook
- Dashboard layout has auth guard + onboarding guard
- Data fetching: useEffect/useState/apiFetch (no react-query)
- CSS custom properties for theming, no component library
