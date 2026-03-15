# User Testing

Testing surface, tool configuration, and resource cost classification.

**What belongs here:** Validation surface details, concurrency limits, setup notes, runtime findings.

---

## Validation Surface

- **Primary surface:** Web browser at http://localhost:3000
- **Tool:** agent-browser (Playwright Chromium headless)
- **API surface:** curl against http://localhost:3001
- **Both servers must be running** for validation

### Validation Readiness

Dry run completed successfully:
- Landing page, sign-in, sign-up all load correctly
- Navigation between pages works
- Forms render with proper fields
- No broken assets or missing images
- Console clean of errors

Cleanup-infrastructure runtime note:
- The root-route error boundary does not have a reliable natural trigger in normal flows. To validate its fallback UI safely, use an isolated browser-session-only runtime fault (for example, temporarily overriding `Date.prototype.toLocaleDateString`), capture the fallback state, then close the session.

## Validation Concurrency

**Machine specs:** 16 GB RAM, 10 CPU cores, ~6 GB used at baseline
**Available headroom:** ~10 GB * 0.7 = **7 GB usable**

### agent-browser surface
- Per-instance cost: ~370 MB (browser + renderer + services)
- Dev server cost: ~200 MB (shared across instances)
- 5 instances: ~2.05 GB total (well within budget)
- **Max concurrent validators: 5**

### curl/API surface
- Negligible resource cost
- **Max concurrent validators: 5**

## Auth for Testing

- Better Auth email/password
- Sign up at /sign-up, sign in at /sign-in
- Session cookie-based (credentials: 'include')
- Test users can be created via sign-up flow

## Known Gaps

- AI features (interview analysis, spec generation) cannot be tested (no API key)
- Password reset email delivery cannot be verified (would need SMTP/email service)
- Current feature-fixes validation note (2026-03-15): `POST /api/auth/request-password-reset` returned `400 {"message":"Reset password isn't enabled","code":"RESET_PASSWORD_DISABLED"}` for both registered and unregistered emails, so the forgot-password success state and any real valid reset token are unavailable until reset-password is enabled server-side.
- Repo-shell API validation successfully used Better Auth and app endpoints directly with isolated cookie jars: `POST /api/auth/sign-up/email`, `GET /api/auth/get-session`, `POST /api/onboarding`, `POST /api/projects`, `POST /api/interviews`, `GET /api/interviews/:id`, and `PUT /api/interviews/:id`.

## Flow Validator Guidance: repo-shell

- Surface purpose: source-backed assertions, local health checks, and test-command validation.
- Isolation boundary: do not edit application code or mission files outside the assigned flow report and evidence directory.
- Allowed actions: read files, run grep/read-only repo checks, run `bun run test` for package-level validation, run local `curl` health checks against `localhost:3000` and `localhost:3001`.
- Avoid interfering with browser validators: do not stop shared dev servers and do not mutate shared application data.
- Evidence should be saved as command output snippets or short text notes in the assigned evidence directory.

## Flow Validator Guidance: browser

- Surface purpose: real web UI validation through `agent-browser` on `http://localhost:3000`.
- Isolation boundary: use a dedicated browser session; if sign-up is needed, create a unique test account for the assigned flow only.
- Do not modify shared infrastructure outside normal user actions in the app. Avoid destructive actions on shared records unless the assertion explicitly requires it.
- Prefer routes and interactions that stay within the assigned assertions. Capture screenshots for key states and note console/network observations in the flow report.
- If `agent-browser`'s request list misses app fetch traffic for a loading-state check, it is acceptable to use a temporary in-session `window.fetch` wrapper that delays matching requests while still allowing the real backend response to resolve; document the wrapper and affected endpoints in the flow report.
- Close the browser session before exiting the flow validator.
