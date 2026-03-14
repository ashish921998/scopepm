---
name: web-test-worker
description: Writes web component and route tests using Vitest + React Testing Library
---

# Web Test Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that are purely about writing web frontend tests. Components and routes already exist; this worker adds test coverage.

## Work Procedure

1. **Read the feature description.** Identify which components/routes to test and what scenarios to cover.

2. **Read the component/route code** to understand:
   - What it renders (text, inputs, buttons, links)
   - What hooks it uses (useSession, useNavigate, useSearch)
   - What API calls it makes
   - What props it accepts (for components)

3. **Read existing test files** (if any) to understand test patterns, mock setup, and test utilities.

4. **Set up mocks for external dependencies:**
   - Mock `@tanstack/react-router` (useNavigate, Link, useSearch, createFileRoute)
   - Mock `app/lib/auth-client` (useSession, signIn, signUp, signOut, authClient)
   - Mock `app/lib/api` (apiFetch)
   - Use `vi.mock()` for module-level mocks

5. **Write tests:**
   - Component tests: verify rendering, text content, interactive elements
   - Route tests: verify form fields render, auth guard behavior
   - Use `render()` from @testing-library/react
   - Use `screen.getByText()`, `screen.getByRole()`, etc. for queries
   - Use `@testing-library/jest-dom` matchers where available

6. **Run tests:** `cd packages/web && bun run test` - all must pass with 0 failures.

7. **Verify test count** meets the minimum specified in the feature description.

8. **Also run API tests** to confirm full monorepo suite passes: `cd packages/api && bun run test`

9. **Commit** with descriptive message.

## Example Handoff

```json
{
  "salientSummary": "Wrote 12 web tests: Hero (2), Features (2), landing components (4: HowItWorks, Problem, CTA, Footer), sign-in (2), sign-up (1), dashboard auth guard (1). All pass. Full monorepo: 42 tests, 0 failures.",
  "whatWasImplemented": "Test files for landing components (Hero, Features, HowItWorks, Problem, CTA, Footer), auth forms (sign-in, sign-up), and dashboard auth guard. Mocked TanStack Router and auth client.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/web && bun run test", "exitCode": 0, "observation": "12 tests passed, 0 failed" },
      { "command": "cd packages/api && bun run test", "exitCode": 0, "observation": "30 tests passed, 0 failed" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "packages/web/app/__tests__/components/Hero.test.tsx", "cases": [
        { "name": "renders headline text", "verifies": "Hero component renders" },
        { "name": "renders CTA button", "verifies": "Hero has call to action" }
      ]},
      { "file": "packages/web/app/__tests__/routes/sign-in.test.tsx", "cases": [
        { "name": "renders email and password inputs", "verifies": "Sign-in form fields" },
        { "name": "renders submit button", "verifies": "Sign-in submit" }
      ]},
      { "file": "packages/web/app/__tests__/routes/dashboard.test.tsx", "cases": [
        { "name": "redirects when no session", "verifies": "Auth guard" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Vitest or testing-library setup is broken
- Components import modules that can't be mocked (binary dependencies, native modules)
- Component code has import errors that prevent test compilation
