---
phase: 4
slug: dashboard-intelligence
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-19
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing from Phase 1) |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 04-01-01 | 01 | 1 | DASH-04,05,06 | unit | `npx vitest run src/__tests__/api/dashboard-stats.test.ts` | Plan 01 | pending |
| 04-01-02 | 01 | 1 | DASH-02 | unit | `npx vitest run src/__tests__/contacts/search.test.ts` | Plan 01 | pending |
| 04-02-01 | 02 | 2 | DASH-01,04,05,06 | unit | `npx vitest run src/__tests__/components/dashboard.test.tsx` | Plan 02 | pending |
| 04-02-02 | 02 | 2 | DASH-07 | unit | `npx vitest run src/__tests__/components/analytics.test.tsx` | Plan 02 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] vitest already installed (Phase 1)
- [x] vitest.config.ts exists (Phase 1)
- [x] Test files created inline by plans

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard visual layout | DASH-01 | Requires visual inspection | 1. Visit /dashboard 2. Verify risk/triage/action widgets visible 3. Check responsive layout |
| Chart rendering | DASH-07 | Requires recharts to render in browser | 1. Visit /dashboard 2. Verify analytics charts render with data 3. Toggle 7d/30d/90d |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (inline)
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
