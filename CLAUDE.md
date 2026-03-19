# Scope PM — Project Rules

## Repository Structure

- Monorepo managed with Bun workspaces (`packages/*`)
- `packages/web/` — React 19 frontend (Vite, TanStack Router, TanStack Query)
- `packages/api/` — Hono API server (Drizzle ORM, Neon/Postgres, Better Auth)

## Component Organization

- IMPORTANT: Always reuse components from `packages/web/app/components/` before creating new ones
- Place new UI components in `packages/web/app/components/`
- Route pages go in `packages/web/app/routes/`
- Shared utilities go in `packages/web/app/lib/`
- Components use PascalCase filenames (e.g., `Hero.tsx`, `Features.tsx`)
- Components are function components, no class components

## Design System & Styling

### Approach

- IMPORTANT: This project uses **vanilla CSS with CSS custom properties** — no Tailwind, no CSS-in-JS, no CSS Modules
- All styles live in `packages/web/app/styles/landing.css`
- Components use CSS class names (e.g., `className="btn-primary"`)

### Design Tokens (CSS Custom Properties)

All tokens are defined in `:root` in `packages/web/app/styles/landing.css`:

**Backgrounds (warm off-whites):**
- `--bg-primary: #FAFAF8`
- `--bg-secondary: #F5F3F0`
- `--bg-tertiary: #EDEAE6`

**Text (near-blacks with warm tint):**
- `--text-primary: #1A1918`
- `--text-secondary: #6B6560`
- `--text-muted: #9C958E`

**Terracotta Accent:**
- `--accent: #C4553A`
- `--accent-hover: #B34A31`
- `--accent-soft: rgba(196, 85, 58, 0.08)`
- `--accent-medium: rgba(196, 85, 58, 0.15)`

**Borders:**
- `--border: rgba(26, 25, 24, 0.08)`
- `--border-hover: rgba(26, 25, 24, 0.15)`

### Typography

- Headings: `'Instrument Serif', Georgia, serif` — weight 400, letter-spacing -0.02em
- Body: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`

### Styling Rules

- IMPORTANT: Never hardcode colors — always use `var(--*)` tokens from `landing.css`
- IMPORTANT: Never introduce Tailwind, styled-components, or CSS Modules
- Use existing CSS classes (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`, `.form-input`, `.form-card`, etc.) before creating new ones
- Cards: `border-radius: 16px` — Buttons: `border-radius: 8px` — Badges: `border-radius: 999px`
- Standard card pattern: `background: var(--bg-primary); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem`
- Section dividers use gradient border lines: `linear-gradient(90deg, transparent, var(--border-hover), transparent)`
- Responsive breakpoint: `768px` for mobile layouts

### Existing UI Patterns

**Buttons:** `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`
**Forms:** `.form-card`, `.form-group`, `.form-label`, `.form-input`, `.form-textarea`, `.field-error`, `.form-input--error`
**Cards:** `.dashboard-card`, `.project-card`, `.feature-card`, `.step-card`, `.stats-card`
**Badges:** `.status-badge`, `.priority-badge`, `.coming-soon-badge` with modifiers like `.status-pending`, `.status-approved`, `.priority-high`
**Layout:** `.container` (max-width 1200px), `.narrow-container` (max-width 760px)
**Lists:** `.interview-list`, `.spec-list`, `.activity-list`
**Empty state:** `.empty-state` with `.empty-icon`
**Loading:** `.skeleton`, `.loading-text`

## Figma MCP Integration Rules

These rules apply when the Figma MCP server is connected.

### Required Flow (do not skip)

1. Run `get_design_context` first to fetch the structured representation for the exact node(s)
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s)
3. Run `get_screenshot` for a visual reference of the node variant being implemented
4. Only after you have both `get_design_context` and `get_screenshot`, download any assets needed and start implementation
5. Translate the output into this project's vanilla CSS conventions — replace any Tailwind with CSS classes following `landing.css` patterns
6. Validate against Figma for 1:1 look and behavior before marking complete

### Implementation Rules

- Treat Figma MCP output (typically React + Tailwind) as a **representation of design intent**, not final code
- IMPORTANT: Replace any Tailwind utility classes with vanilla CSS using existing classes from `landing.css` or new classes following the same conventions
- Map Figma colors to CSS custom properties in `landing.css`
- Match the warm minimal aesthetic: terracotta accent, warm off-white backgrounds, subtle borders, Instrument Serif headings
- Strive for 1:1 visual parity with the Figma design

### Asset Handling

- IMPORTANT: If the Figma MCP server returns a localhost source for an image or SVG, use that source directly
- IMPORTANT: DO NOT import/add new icon packages — all assets should come from the Figma payload
- IMPORTANT: DO NOT use or create placeholders if a localhost source is provided
- Store downloaded assets in `packages/web/public/`

## Frontend Conventions

- TanStack Router for routing (`packages/web/app/routes/`)
- TanStack Query (`@tanstack/react-query`) for server state
- `better-auth` client from `packages/web/app/lib/auth-client.ts` for authentication
- API calls go through `packages/web/app/lib/api.ts`
- Validation helpers in `packages/web/app/lib/validation.ts`
- Deployed to Cloudflare Pages via `wrangler pages deploy`

## API Conventions

- Hono framework for API routes (`packages/api/src/routes/`)
- Drizzle ORM with Neon serverless Postgres (`packages/api/src/db/`)
- Better Auth for authentication (`packages/api/src/auth.ts`)
- Utility/lib modules in `packages/api/src/lib/`
- Deployed to Cloudflare Workers via `wrangler deploy`

## Testing

- Vitest for both web and API packages
- React Testing Library for component tests
- Web tests: `packages/web/app/__tests__/`
- API tests: `packages/api/src/__tests__/`
- Run all: `bun run test`
- Run web only: `bun run --filter web test`
- Run API only: `bun run --filter api test`
