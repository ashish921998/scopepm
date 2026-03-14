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
