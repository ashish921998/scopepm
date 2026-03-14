---
name: api-worker
description: Implements API backend features - route handlers, security fixes, database operations
---

# API Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that modify the API backend: new endpoints, security fixes, route handler changes, database schema changes, middleware modifications.

## Work Procedure

1. **Read the feature description.** Understand what endpoint(s) to create/modify, expected request/response shapes, and error handling requirements.

2. **Read existing code** for the target route file and related files (schema, utils, auth) to understand patterns.

3. **Write tests first (TDD):**
   - Create test file in `packages/api/src/__tests__/`
   - Write failing tests covering success path and all error cases
   - Run tests to confirm they fail: `cd packages/api && bun run test`

4. **Implement the feature:**
   - Follow existing patterns (check AGENTS.md for conventions)
   - Auth check: `const user = c.get('user'); if (!user) return c.json({ error: 'Unauthorized' }, 401)`
   - ID parsing: Use `parseInteger` from lib/utils.ts
   - Ownership check: Compare record userId to authenticated user ID
   - Use explicit field whitelists for updates (NEVER spread raw body into .set())
   - Environment variables: Use `process.env.VAR_NAME` (not c.env)

5. **Run tests:** `cd packages/api && bun run test` - all must pass.

6. **Manual verification:**
   - If the API server is running (port 3001), test with curl
   - Verify response shapes match expectations

7. **Commit** with descriptive message.

## Example Handoff

```json
{
  "salientSummary": "Added PUT /api/interviews/:id endpoint with title/transcript update, field validation (400 on empty), ownership check (403), auth check (401). Wrote 6 tests, all passing. Verified with curl against running server.",
  "whatWasImplemented": "PUT /api/interviews/:id endpoint in packages/api/src/routes/interviews.ts. Accepts {title, transcript}, validates non-empty, checks auth/ownership, updates record preserving analysis status. Returns 200 with updated interview.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/api && bun run test -- interviews", "exitCode": 0, "observation": "6 tests passed, 0 failed" },
      { "command": "curl -X PUT http://localhost:3001/api/interviews/1 -H 'Content-Type: application/json' -d '{\"title\":\"Updated\",\"transcript\":\"test\"}'", "exitCode": 0, "observation": "Returns 401 Unauthorized (no session cookie)" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "packages/api/src/__tests__/interviews.test.ts", "cases": [
        { "name": "PUT /api/interviews/:id - valid update returns 200", "verifies": "Successful interview update" },
        { "name": "PUT /api/interviews/:id - empty title returns 400", "verifies": "Field validation" },
        { "name": "PUT /api/interviews/:id - unauthorized returns 401", "verifies": "Auth check" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Database schema changes are needed that aren't described in the feature
- An endpoint depends on another endpoint that doesn't exist yet
- Auth middleware behavior is unclear or needs modification
