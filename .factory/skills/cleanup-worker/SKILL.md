---
name: cleanup-worker
description: Handles dead code removal, dependency cleanup, and configuration fixes
---

# Cleanup Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features involving file deletion, dependency removal, configuration corrections, and other non-functional cleanup tasks that don't require new code logic.

## Work Procedure

1. **Read the feature description carefully.** Identify every discrete cleanup action required.

2. **For each file to delete:**
   - Verify the file exists first
   - Search for ALL imports/references to the file across the entire codebase
   - Delete the file
   - Remove any import statements that referenced it
   - Verify no remaining references exist

3. **For dependency removal:**
   - Remove from package.json
   - Run `bun install` to update lockfile
   - Verify no import statements reference the removed package
   - Verify the app still starts without errors

4. **For configuration fixes:**
   - Read the current file
   - Make the targeted fix
   - Verify the fix is correct

5. **Run verification steps** from the feature description.

6. **Commit** with a descriptive message.

## Example Handoff

```json
{
  "salientSummary": "Removed unused WaitlistForm component (deleted file + 0 imports found), removed @planetscale/database from api/package.json, ran bun install successfully, fixed .env.example to use postgresql:// URL.",
  "whatWasImplemented": "Deleted packages/web/app/components/WaitlistForm.tsx, removed @planetscale/database dependency, updated .env.example DATABASE_URL from mysql:// to postgresql://",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "grep -r WaitlistForm packages/web/", "exitCode": 1, "observation": "No matches - component fully removed" },
      { "command": "grep @planetscale/database packages/api/package.json", "exitCode": 1, "observation": "Not found in dependencies" },
      { "command": "bun install", "exitCode": 0, "observation": "Dependencies installed successfully" },
      { "command": "grep postgresql packages/api/.env.example", "exitCode": 0, "observation": "DATABASE_URL now uses postgresql://" }
    ],
    "interactiveChecks": []
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A file marked for deletion is imported by many files and removal would break functionality
- Dependency removal causes build/runtime errors that require code changes beyond simple import removal
