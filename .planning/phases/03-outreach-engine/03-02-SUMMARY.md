---
phase: 03-outreach-engine
plan: 02
subsystem: ai, api, background-jobs
tags: [openai, z-ai, glm-5, trigger-dev, gmail, outreach, cron]

# Dependency graph
requires:
  - phase: 03-outreach-engine/01
    provides: Gmail client, Open Brain client, draft validations, MIME builder
  - phase: 02-data-pipeline-contacts
    provides: Contact extraction AI pattern, meeting dispatcher pattern, encryption
provides:
  - AI outreach draft generation with 5-layer context prompt (generateOutreachDraft)
  - Hourly outreach dispatcher cron (outreach-draft-dispatcher)
  - Per-user draft generation task (generate-user-drafts)
  - DraftContext interface for layered AI prompt construction
affects: [03-outreach-engine/03, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [layered-context-prompt, once-per-day-at-window-start, best-effort-sync, db-first-then-sync]

key-files:
  created:
    - src/lib/ai/draft-outreach.ts
    - src/trigger/outreach-dispatcher.ts
    - src/trigger/generate-user-drafts.ts
    - src/__tests__/ai/draft-outreach.test.ts
    - src/__tests__/trigger/outreach-dispatcher.test.ts
    - src/__tests__/trigger/generate-user-drafts.test.ts
  modified: []

key-decisions:
  - "Outreach dispatcher triggers once per day at user's start_hour (not every hour in window like meeting dispatcher)"
  - "Drafts persisted to outreach_drafts table BEFORE Gmail sync attempt -- DB is source of truth"
  - "Gmail sync is best-effort: failure sets gmail_sync_status='failed' without blocking draft creation"
  - "Re-establish mock return values in beforeEach to prevent cross-test leakage from vi.clearAllMocks"

patterns-established:
  - "db-first-then-sync: Persist to database first, then attempt external service sync as best-effort"
  - "layered-context-prompt: Build AI prompts from multiple data layers (user profile, contact, meetings, actions, knowledge base)"
  - "once-per-day-dispatch: Dispatcher runs hourly but only triggers at start_hour (not range check)"

requirements-completed: [OUTR-01, OUTR-02, OUTR-03, OBRN-02]

# Metrics
duration: 7min
completed: 2026-03-19
---

# Phase 03 Plan 02: AI Draft Generation Engine Summary

**5-layer context AI outreach drafter with hourly cron dispatcher, per-user fan-out, DB-first persistence, and best-effort Gmail sync**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-19T14:21:17Z
- **Completed:** 2026-03-19T14:28:15Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- AI draft generation module using z.ai GLM-5 with 5-layer context prompt (user personality, contact details, meetings, action items, Open Brain)
- Hourly cron dispatcher that triggers outreach generation once per day at each user's processing window start
- Per-user task that finds due contacts, generates personalized drafts, persists to DB, and best-effort syncs to Gmail
- 24 new tests covering all modules (10 AI drafter, 6 dispatcher, 8 per-user task)

## Task Commits

Each task was committed atomically:

1. **Task 1: AI outreach draft generation with layered context prompt** - `db11018` (feat)
2. **Task 2: Trigger.dev outreach dispatcher and per-user draft generator** - `664eaa9` (feat)
3. **Task 3: Per-user draft generation task tests** - `81d57d5` (test)

_Note: TDD tasks have RED+GREEN in single commits for Tasks 1-2, separate test commit for Task 3_

## Files Created/Modified
- `src/lib/ai/draft-outreach.ts` - AI draft generation with layered context prompt via z.ai GLM-5
- `src/trigger/outreach-dispatcher.ts` - Hourly cron dispatcher, fans out to per-user tasks at start_hour
- `src/trigger/generate-user-drafts.ts` - Finds due contacts, generates drafts, DB persist, Gmail sync
- `src/__tests__/ai/draft-outreach.test.ts` - 10 tests for AI draft generation
- `src/__tests__/trigger/outreach-dispatcher.test.ts` - 6 tests for dispatcher
- `src/__tests__/trigger/generate-user-drafts.test.ts` - 8 tests for per-user task

## Decisions Made
- Outreach dispatcher triggers once per day at user's start_hour (not every hour within window like meeting dispatcher) -- drafts are generated in batch once daily
- Drafts persisted to outreach_drafts table BEFORE Gmail sync attempt -- database is source of truth, Gmail sync is secondary
- Gmail sync is best-effort: failure sets gmail_sync_status='failed' without blocking draft creation or throwing
- Re-establish mock return values in beforeEach after vi.clearAllMocks to prevent cross-test mock leakage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing transitive dependency mocks for outreach dispatcher tests**
- **Found during:** Task 2 (outreach-dispatcher.test.ts)
- **Issue:** Meeting-dispatcher.ts transitively imports process-user-meetings.ts which imports task from @trigger.dev/sdk, granola client, and ai extract-contacts -- all needed mocking
- **Fix:** Added vi.mock for @/trigger/process-user-meetings, @/lib/granola/client, @/lib/ai/extract-contacts, @/lib/crypto/encryption, and added `task` export to @trigger.dev/sdk mock
- **Files modified:** src/__tests__/trigger/outreach-dispatcher.test.ts
- **Verification:** All 6 dispatcher tests pass
- **Committed in:** 664eaa9 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed mock return value persistence across tests in generate-user-drafts tests**
- **Found during:** Task 3 (Test 7 failing with gmailSynced=0)
- **Issue:** vi.clearAllMocks() in beforeEach clears mock implementations set via vi.mock factory, causing createGmailDraft to return undefined instead of "gmail-draft-123"
- **Fix:** Added explicit mock re-establishment in beforeEach for decrypt, generateOutreachDraft, createGmailDraft, and fetchOpenBrainContext
- **Files modified:** src/__tests__/trigger/generate-user-drafts.test.ts
- **Verification:** All 8 tests pass
- **Committed in:** 81d57d5 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for test correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Draft generation engine complete, ready for Phase 03-03 (draft review UI and actions)
- All outreach pipeline components in place: dispatcher -> per-user task -> AI draft -> DB persist -> Gmail sync
- Gmail sync failures gracefully handled, allowing UI-only draft review as fallback

## Self-Check: PASSED

All 6 files verified on disk. All 3 task commits verified in git log.

---
*Phase: 03-outreach-engine*
*Completed: 2026-03-19*
