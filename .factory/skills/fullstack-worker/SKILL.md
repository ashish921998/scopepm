---
name: fullstack-worker
description: Handles cross-cutting features spanning both API and web packages
---

# Fullstack Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that span both packages (API + web), or infrastructure setup affecting both packages (test framework, build config, shared utilities).

## Work Procedure

1. **Read the feature description.** Identify all changes needed in both packages.

2. **Read existing configs** in both packages (package.json, tsconfig.json, vite.config.ts) to understand current setup.

3. **For infrastructure features (test setup, build config):**
   - Install dependencies in the correct package(s)
   - Create config files following existing patterns
   - Add scripts to package.json
   - Create minimal smoke tests to verify setup works
   - Run the smoke tests to confirm: `cd packages/api && bun run test` and `cd packages/web && bun run test`

4. **For cross-cutting features:**
   - Write tests first for both API and web changes
   - Implement API changes first (backend before frontend)
   - Implement web changes
   - Run all tests

5. **Verify everything works:**
   - Both test suites pass
   - No TypeScript errors (if typecheck available)
   - Both servers start without errors (if running)

6. **Commit** with descriptive message.

## Example Handoff

```json
{
  "salientSummary": "Set up Vitest in both packages: installed vitest + @testing-library/react + jsdom, created vitest.config.ts files, added test scripts, created smoke tests (health endpoint test for API, Hero render test for web). Both suites pass: API 1 test, Web 1 test.",
  "whatWasImplemented": "Vitest configuration for packages/api (vitest.config.ts, test script, health.test.ts) and packages/web (vitest.config.ts with jsdom, test script, hero.test.tsx). Root test script added.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd packages/api && bun run test", "exitCode": 0, "observation": "1 test passed" },
      { "command": "cd packages/web && bun run test", "exitCode": 0, "observation": "1 test passed" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "packages/api/src/__tests__/health.test.ts", "cases": [{ "name": "GET / returns 200 ok", "verifies": "Health check endpoint" }] },
      { "file": "packages/web/app/__tests__/hero.test.tsx", "cases": [{ "name": "Hero renders headline", "verifies": "Hero component renders" }] }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Dependency installation fails due to version conflicts
- Config changes break existing functionality in unexpected ways
- Changes needed in root workspace config that could affect other packages
