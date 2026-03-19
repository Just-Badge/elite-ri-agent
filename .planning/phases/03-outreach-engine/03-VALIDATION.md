---
phase: 3
slug: outreach-engine
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-19
---

# Phase 3 — Validation Strategy

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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | OUTR-01 | unit | `npx vitest run src/__tests__/trigger/outreach-dispatcher.test.ts` | Plan 01 | pending |
| 03-01-02 | 01 | 1 | OUTR-02,OBRN-01,OBRN-02 | unit | `npx vitest run src/__tests__/ai/draft-email.test.ts` | Plan 01 | pending |
| 03-02-01 | 02 | 1 | OUTR-05 | unit | `npx vitest run src/__tests__/gmail/service.test.ts` | Plan 02 | pending |
| 03-03-01 | 03 | 2 | OUTR-04 | unit | `npx vitest run src/__tests__/api/drafts.test.ts` | Plan 03 | pending |
| 03-03-02 | 03 | 2 | OUTR-06,OUTR-07,OUTR-08 | unit | `npx vitest run src/__tests__/components/draft-review.test.tsx` | Plan 03 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] vitest already installed (Phase 1)
- [x] vitest.config.ts exists (Phase 1)
- [x] Test files created inline by plans

*All test infrastructure carried from Phase 1. No separate Wave 0 needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gmail draft creation | OUTR-05 | Requires live Gmail API with valid OAuth token | 1. Generate a draft 2. Open Gmail 3. Verify draft appears in Drafts folder |
| Gmail send via approve | OUTR-06 | Requires live Gmail API | 1. Approve a draft in dashboard 2. Check Gmail Sent folder 3. Verify email was sent |
| Open Brain context enrichment | OBRN-01 | Requires user's Open Brain Supabase tables to exist | 1. Populate Open Brain with relevant data 2. Generate draft 3. Verify draft references Open Brain context |
| Draft generation quality | OUTR-02 | Requires real z.ai API key + meaningful contact data | 1. Trigger draft generation for a contact with rich meeting history 2. Review draft tone matches user profile |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (inline — no separate Wave 0)
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Gmail operations, Open Brain, AI quality moved to manual-only with rationale

**Approval:** pending
