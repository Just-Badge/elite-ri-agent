---
phase: 02-data-pipeline-contacts
plan: 03
subsystem: trigger, api
tags: [trigger-dev, cron, schedules-task, fan-out, granola, ai-extraction, dedup, email-match, api-routes, encryption]

# Dependency graph
requires:
  - phase: 02-data-pipeline-contacts/02-01
    provides: "contacts, meetings, contact_meetings, action_items tables, seed import function, Zod validation"
  - phase: 02-data-pipeline-contacts/02-02
    provides: "Granola HTTP client with token rotation, AI contact extraction via z.ai GLM-5"
provides:
  - "Hourly cron dispatcher that fans out to per-user meeting processing tasks"
  - "Per-user task: fetch Granola docs, AI extract contacts, upsert with email dedup"
  - "upsertExtractedContacts helper with 5-strategy email/name dedup"
  - "insertMeetingRecord helper with granola_url format"
  - "POST /api/meetings/process for manual meeting processing trigger"
  - "POST /api/granola/token for Granola refresh token capture"
  - "GET /api/granola/token for token status check"
  - "Seed contact import as Trigger.dev task"
affects: [02-04, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [trigger-dev-dispatcher-fanout, per-user-queue-concurrency, email-based-contact-dedup, cautious-name-merge]

key-files:
  created:
    - src/trigger/meeting-dispatcher.ts
    - src/trigger/process-user-meetings.ts
    - src/trigger/import-seed-contacts.ts
    - src/app/api/meetings/process/route.ts
    - src/app/api/granola/token/route.ts
    - src/__tests__/trigger/meeting-dispatcher.test.ts
    - src/__tests__/api/meetings-process.test.ts
    - src/__tests__/contacts/dedup.test.ts
    - src/__tests__/contacts/meetings.test.ts
  modified: []

key-decisions:
  - "Default processing schedule 8am-20pm UTC when user has no processing_schedule configured"
  - "Extracted upsertExtractedContacts and insertMeetingRecord as named exports for unit testability"
  - "Cautious name-only merge: only fills null fields on existing contact, never overwrites populated fields"
  - "200ms delay between transcript fetches for Granola rate limit protection"

patterns-established:
  - "Dispatcher fan-out: schedules.task cron queries users, filters by timezone window, triggers per-user task with concurrencyLimit 1"
  - "Email-based dedup: email match -> full update, name match -> cautious fill, no match -> insert with ai_confidence"
  - "API route trigger pattern: createClient -> getUser -> tasks.trigger -> return handle.id"

requirements-completed: [DATA-01, DATA-02, DATA-07, DATA-08]

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 02 Plan 03: Trigger.dev Pipeline + API Routes Summary

**Hourly cron dispatcher with per-user fan-out, email-based contact dedup, manual trigger API, and Granola token capture endpoint -- 20 new tests across 4 test files**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T12:11:12Z
- **Completed:** 2026-03-19T12:17:09Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Scheduled cron dispatcher runs hourly, queries users with Granola tokens, checks timezone-aware processing windows, and triggers per-user tasks with isolated queues
- Per-user processing task fetches Granola documents, runs AI contact extraction, and upserts contacts using 5-strategy email/name deduplication with action items and junction records
- Two API routes: POST /api/meetings/process for manual trigger, POST/GET /api/granola/token for token capture and status
- 20 new unit tests: 7 dispatcher, 4 API routes, 5 dedup logic, 4 meeting linking -- all 86 project tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Trigger.dev tasks (dispatcher, processor, seed import)** - `40a66e7` (feat)
2. **Task 2 RED: Failing API route tests** - `33acf6a` (test)
3. **Task 2 GREEN: API routes implementation** - `50b0d63` (feat)
4. **Task 3: Dedup and meeting linking unit tests** - `62c936a` (test)

_Note: Task 2 uses TDD (RED/GREEN commits). Task 3 tests validate helpers created in Task 1._

## Files Created/Modified
- `src/trigger/meeting-dispatcher.ts` - Cron dispatcher with timezone-aware processing window check and per-user fan-out
- `src/trigger/process-user-meetings.ts` - Per-user task: Granola fetch, AI extraction, email dedup, contact upsert with junction records
- `src/trigger/import-seed-contacts.ts` - One-time seed data import task delegating to importSeedContacts
- `src/app/api/meetings/process/route.ts` - POST handler: auth check, tasks.trigger("process-user-meetings")
- `src/app/api/granola/token/route.ts` - POST: encrypt and store token; GET: return token status
- `src/__tests__/trigger/meeting-dispatcher.test.ts` - 7 tests: timezone helper, user query, window filtering, trigger dispatch, default schedule, error handling
- `src/__tests__/api/meetings-process.test.ts` - 4 tests: auth checks (401), trigger returns runId, token encryption and storage
- `src/__tests__/contacts/dedup.test.ts` - 5 tests: email-match update, new-email insert, cautious name merge, low-confidence flag, no-match insert
- `src/__tests__/contacts/meetings.test.ts` - 4 tests: granola_url format, contact_meetings junction, action_items FK linking, skip-already-processed

## Decisions Made
- Default processing schedule (8am-20pm UTC) when user has no processing_schedule JSONB configured -- ensures new users get reasonable defaults
- Extracted upsertExtractedContacts and insertMeetingRecord as separate exported functions for independent unit testing without mocking the entire Granola/AI pipeline
- Cautious name-only merge strategy: when matching by name without email, only fills null/empty fields on existing contact, never overwrites populated data -- prevents AI-generated data from overwriting manually curated information
- 200ms delay between Granola transcript fetches to avoid rate limiting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full Trigger.dev pipeline ready: dispatcher -> per-user processor -> AI extraction -> contact upsert
- API routes ready for dashboard integration (manual trigger, token capture)
- Seed import task available for one-time data loading
- Contact dedup logic fully tested and ready for production use

## Self-Check: PASSED

- All 9 created files verified on disk
- All 4 commit hashes (40a66e7, 33acf6a, 50b0d63, 62c936a) verified in git log
- 86/86 project tests passing

---
*Phase: 02-data-pipeline-contacts*
*Completed: 2026-03-19*
