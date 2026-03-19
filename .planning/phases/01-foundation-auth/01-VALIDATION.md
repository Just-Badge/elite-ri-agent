---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: false
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
| **Config file** | none — Wave 0 installs |
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
| 01-01-01 | 01 | 1 | AUTH-01 | integration | `npx vitest run src/__tests__/auth.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-02 | integration | `npx vitest run src/__tests__/oauth-token.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | AUTH-03 | integration | `npx vitest run src/__tests__/session.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | TNNT-01 | unit | `npx vitest run src/__tests__/rls.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | TNNT-02 | unit | `npx vitest run src/__tests__/tenant-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | AUTH-04 | unit | `npx vitest run src/__tests__/api-keys.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | AUTH-05 | unit | `npx vitest run src/__tests__/profile.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-03 | 03 | 2 | AUTH-06 | unit | `npx vitest run src/__tests__/schedule-config.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] vitest + @testing-library/react installed
- [ ] vitest.config.ts created
- [ ] Test stubs for all phase requirements

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth redirect flow | AUTH-01 | Requires browser interaction with Google | 1. Click "Sign in with Google" 2. Complete Google auth 3. Verify redirect back to app with session |
| Gmail token persistence | AUTH-02 | Requires real Google OAuth flow | 1. Sign in 2. Check `oauth_tokens` table for encrypted refresh_token |
| RLS data isolation | TNNT-01 | Requires two authenticated users | 1. Sign in as User A, create data 2. Sign in as User B 3. Verify User B cannot see User A's data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
