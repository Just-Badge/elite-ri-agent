---
phase: 2
slug: data-pipeline-contacts
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (exists from Phase 1) |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-07 | unit | `npx vitest run src/__tests__/contacts/dedup.test.ts` | Plan 03 Task 3 | pending |
| 02-01-02 | 01 | 1 | DATA-01 | unit | `npx vitest run src/__tests__/trigger/meeting-dispatcher.test.ts` | Plan 03 Task 1 | pending |
| 02-02-01 | 02 | 2 | DATA-03-06 | unit | `npx vitest run src/__tests__/ai/extract-contacts.test.ts` | Wave 0 | pending |
| 02-02-02 | 02 | 2 | DATA-02 | unit | `npx vitest run src/__tests__/api/meetings-process.test.ts` | Plan 03 Task 2 | pending |
| 02-02-03 | 02 | 2 | DATA-08 | unit | `npx vitest run src/__tests__/contacts/meetings.test.ts` | Plan 03 Task 3 | pending |
| 02-03-01 | 04 | 2 | CONT-01-04 | unit | `npx vitest run src/__tests__/api/contacts.test.ts` | Plan 04 Task 1 | pending |
| 02-03-02 | 04 | 2 | CONT-01-04 | unit | `npx vitest run src/__tests__/components/contact-card.test.tsx` | Plan 04 Task 2 | pending |
| 02-03-03 | 04 | 2 | CONT-05-07 | unit | `npx vitest run src/__tests__/components/contact-form.test.tsx` | Wave 0 | pending |

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
| Granola API token exchange | DATA-01 | Requires live Granola bearer token and WorkOS token rotation | 1. Capture token from Granola app 2. Configure in settings 3. Trigger processing 4. Verify meetings fetched |
| Scheduled processing window | DATA-01 | Requires Trigger.dev cron running on configured schedule | 1. Set schedule to every 1 hour 2. Wait for cron to fire 3. Verify meeting processing runs within window |
| AI extraction quality | DATA-03-06 | Requires real transcript + z.ai API key | 1. Process a real Granola meeting 2. Verify extracted contact has name, email, context, action items 3. Check extraction accuracy |
| Seed data import | DATA-07 | Requires `relationships/` directory with MD files | 1. Run import task 2. Verify all contacts appear in dashboard 3. Check categories match directory names |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (inline -- no separate Wave 0)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Granola token, scheduled processing, AI quality, seed import moved to manual-only with rationale
- [x] dedup.test.ts mapped to Plan 03 Task 3 (DATA-07)
- [x] meetings.test.ts mapped to Plan 03 Task 3 (DATA-08)
- [x] contacts.test.ts mapped to Plan 04 Task 1 (CONT-01-04)

**Approval:** pending
