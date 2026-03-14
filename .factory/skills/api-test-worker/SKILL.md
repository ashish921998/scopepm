---
name: api-test-worker
description: Writes comprehensive API test suites for route handlers
---

# API Test Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that are purely about writing API tests. The route handlers already exist; this worker adds test coverage.

## Work Procedure

1. **Read the feature description.** Identify which routes to test and what scenarios to cover.

2. **Read the route handler code** to understand:
   - Request shapes (method, path, body, query params)
   - Response shapes (status codes, JSON structure)
   - Validation rules (required fields, formats)
   - Auth requirements
   - Error responses

3. **Read existing test files** (if any) to understand the established test patterns, mocking approach, and test utilities.

4. **Design the test suite:**
   - Group tests by endpoint (describe block per endpoint)
   - Cover: success path, validation errors (400), auth errors (401), ownership errors (403), not found (404)
   - For AI endpoints: test ONLY error cases (missing API key → 500), NOT successful AI responses

5. **Write tests using Hono's testing approach:**
   - Use `app.request()` or create test instances
   - Mock the database layer - DO NOT hit the real remote database
   - Mock auth middleware for authenticated tests
   - Assert response status codes and body shapes

6. **Run tests:** `cd packages/api && bun run test` - all must pass with 0 failures.

7. **Verify test count** meets the minimum specified in the feature description.

8. **Commit** with descriptive message.

## Example Handoff

```json
{
  "salientSummary": "Wrote 12 tests for project routes: GET list (2), GET overview (1), POST create (2), GET detail (3), GET stats (1), PUT update (2), DELETE (2). All pass, auth middleware checked on GET /api/projects. Mocked db layer with vi.mock.",
  "whatWasImplemented": "packages/api/src/__tests__/projects.test.ts with 12 test cases covering all project CRUD endpoints including success paths, validation errors, not-found errors, and auth middleware.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/api && bun run test -- projects", "exitCode": 0, "observation": "12 tests passed, 0 failed" },
      { "command": "cd packages/api && bun run test", "exitCode": 0, "observation": "All tests pass across all files" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "packages/api/src/__tests__/projects.test.ts", "cases": [
        { "name": "GET /api/projects returns 200 with projects array", "verifies": "Project list endpoint" },
        { "name": "GET /api/projects returns 401 without auth", "verifies": "Auth middleware" },
        { "name": "POST /api/projects creates project", "verifies": "Project creation" },
        { "name": "POST /api/projects returns 400 for empty name", "verifies": "Validation" },
        { "name": "GET /api/projects/:id returns 200 with detail", "verifies": "Project detail" },
        { "name": "GET /api/projects/:id returns 404 for missing", "verifies": "Not found handling" },
        { "name": "PUT /api/projects/:id updates project", "verifies": "Project update" },
        { "name": "DELETE /api/projects/:id removes project", "verifies": "Project deletion" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The route handler has bugs that prevent meaningful testing
- The test infrastructure is broken (vitest config issues, missing dependencies)
- Mock setup is impossible due to tightly coupled code that needs refactoring
- An endpoint listed in the feature doesn't exist yet
