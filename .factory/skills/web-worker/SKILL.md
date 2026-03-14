---
name: web-worker
description: Implements web frontend features - routes, components, forms, UI
---

# Web Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that modify the web frontend: new routes/pages, component creation, form logic, styling, UI improvements.

## Work Procedure

1. **Read the feature description.** Understand what pages/components to create/modify, user interactions, and expected behavior.

2. **Read existing code** for related routes and components to understand patterns:
   - Check `packages/web/app/routes/` for route patterns
   - Check `packages/web/app/components/` for component patterns
   - Check `packages/web/app/styles/landing.css` for CSS variables and design tokens
   - Check `packages/web/app/lib/` for API client and auth client usage

3. **Write tests first (TDD):**
   - Create test file in `packages/web/app/__tests__/`
   - Write failing tests for the component/route rendering and key behaviors
   - Run: `cd packages/web && bun run test`

4. **Implement the feature:**
   - Follow existing patterns (check AGENTS.md for conventions)
   - Routes: Use TanStack Router file-based routing with `createFileRoute()` or `createLazyFileRoute()`
   - Styling: Use inline styles or CSS classes matching existing design system (CSS custom properties)
   - Forms: Use controlled React state, NOT uncontrolled refs
   - Validation: Show styled inline error elements with class 'field-error', NOT browser tooltips
   - API calls: Use `apiFetch` from `app/lib/api.ts`
   - Auth: Use `authClient` from `app/lib/auth-client.ts`
   - Loading states: Use skeleton components, NOT plain text

5. **Run tests:** `cd packages/web && bun run test` - all must pass.

6. **Manual verification with agent-browser:**
   - Navigate to the affected page(s)
   - Test each user interaction described in the feature
   - Take screenshots to document the result
   - Verify at both desktop (1280px) and mobile (375px) viewports if the feature involves responsive design

7. **Commit** with descriptive message.

## Example Handoff

```json
{
  "salientSummary": "Created /reset-password route with token handling, password/confirm fields, client-side validation (match + min 8 chars), Better Auth resetPassword API call, success/error states. Styled consistently with sign-in/sign-up pages. Verified at desktop and mobile viewports.",
  "whatWasImplemented": "packages/web/app/routes/reset-password.tsx: Full reset password page with token from search params, validation, API integration, success redirect to /sign-in, error handling for invalid tokens, no-token state with link to /forgot-password.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/web && bun run test", "exitCode": 0, "observation": "All tests pass" }
    ],
    "interactiveChecks": [
      { "action": "Navigate to /reset-password?token=test at 1280px viewport", "observed": "Form renders with new password and confirm password fields, submit button visible" },
      { "action": "Enter mismatched passwords and submit", "observed": "Inline error 'Passwords do not match' appears below confirm field, no network request sent" },
      { "action": "Navigate to /reset-password with no token", "observed": "Shows 'Valid reset link required' message with link to /forgot-password" },
      { "action": "Check at 375px viewport", "observed": "Form stacks properly, all fields and button visible" }
    ]
  },
  "tests": {
    "added": [
      { "file": "packages/web/app/__tests__/routes/reset-password.test.tsx", "cases": [
        { "name": "renders password form when token present", "verifies": "Form rendering with token" },
        { "name": "shows message when no token", "verifies": "No-token state" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- An API endpoint the feature depends on doesn't exist yet
- The design system needs changes that would affect other pages
- Auth client methods needed don't exist (e.g., resetPassword not available)
- TanStack Router configuration changes needed beyond route file creation
