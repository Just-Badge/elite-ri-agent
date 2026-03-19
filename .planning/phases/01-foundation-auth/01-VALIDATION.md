---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (created in Plan 01-01 Task 2) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-02 | 01 | 1 | AUTH-04 | unit | `npx vitest run src/__tests__/crypto/encryption.test.ts` | Plan 01-01 Task 2 | pending |
| 01-02-01 | 02 | 2 | AUTH-01 | unit | `npx vitest run src/__tests__/auth/oauth-flow.test.ts` | Plan 01-02 Task 2 | pending |
| 01-02-02 | 02 | 2 | AUTH-02 | unit | `npx vitest run src/__tests__/auth/token-capture.test.ts` | Plan 01-02 Task 2 | pending |
| 01-03-01 | 03 | 2 | AUTH-05 | unit | `npx vitest run src/__tests__/settings/profile-form.test.ts` | Plan 01-03 Task 3 | pending |
| 01-03-02 | 03 | 2 | AUTH-06 | unit | `npx vitest run src/__tests__/settings/schedule-form.test.ts` | Plan 01-03 Task 3 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] vitest + @testing-library/react installed (Plan 01-01 Task 1)
- [x] vitest.config.ts created (Plan 01-01 Task 2)
- [x] Test files for encryption, auth, and settings validation created by their respective plans

*All test infrastructure is created inline by the plans themselves, no separate Wave 0 needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth redirect flow | AUTH-01 | Requires browser interaction with Google consent screen; cannot be automated without a real OAuth flow | 1. Click "Sign in with Google" 2. Complete Google auth 3. Verify redirect back to app with active session |
| Gmail token persistence | AUTH-02 | Requires real Google OAuth flow to produce provider_refresh_token | 1. Sign in via Google OAuth 2. Query `oauth_tokens` table in Supabase 3. Verify `google_refresh_token_encrypted` is non-null |
| Session persistence across refresh | AUTH-03 | Requires live Supabase instance with active session and browser cookies; middleware token refresh cannot be unit tested without full server | 1. Sign in via Google OAuth 2. Refresh browser 3. Verify user remains authenticated (not redirected to /login) 4. Verify `supabase.auth.getUser()` returns valid user |
| RLS data isolation (user_settings) | TNNT-01 | Requires live Supabase instance with two authenticated users; RLS policies execute at database level | 1. Sign in as User A, save settings 2. Sign in as User B 3. Verify User B cannot see User A's settings via API or direct Supabase query |
| Per-user settings isolation | TNNT-02 | Requires live Supabase instance with multiple users to verify RLS enforcement across settings endpoints | 1. Sign in as User A, save profile and API key 2. Sign in as User B, check GET /api/settings/profile returns empty (not User A's data) 3. Verify User B's API key status shows "Not configured" |
| Per-user schedule isolation | TNNT-03 | Requires live Supabase instance; processing_schedule JSONB is stored per user_id with RLS enforcement | 1. Sign in as User A, configure schedule (e.g., interval=4, start=9, end=17) 2. Sign in as User B, check GET /api/settings/schedule returns defaults (not User A's schedule) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no separate Wave 0 needed -- inline)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] AUTH-03, TNNT-01, TNNT-02, TNNT-03 moved to manual-only with rationale (require live Supabase)

**Approval:** pending
