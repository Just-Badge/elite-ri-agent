---
phase: 03-outreach-engine
plan: 03
subsystem: api, ui
tags: [nextjs, react, supabase, gmail, shadcn, zod, react-hook-form]

# Dependency graph
requires:
  - phase: 03-01
    provides: Gmail client (create/send/delete draft), Zod schemas, DB migration
  - phase: 03-02
    provides: AI draft generation and outreach_drafts table data
provides:
  - Draft CRUD API routes (list, update, dismiss, send)
  - Draft review dashboard page with send/edit/dismiss workflow
  - DraftCard, DraftList, DraftEditor UI components
  - Sidebar navigation for Drafts
affects: [04-intelligence-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [fresh-gmail-draft-on-send, best-effort-gmail-cleanup, base-ui-getAllByText-test-pattern]

key-files:
  created:
    - src/app/api/drafts/route.ts
    - src/app/api/drafts/[id]/route.ts
    - src/app/api/drafts/[id]/send/route.ts
    - src/app/(dashboard)/drafts/page.tsx
    - src/components/drafts/draft-card.tsx
    - src/components/drafts/draft-list.tsx
    - src/components/drafts/draft-editor.tsx
    - src/__tests__/api/drafts.test.ts
    - src/__tests__/api/drafts-send.test.ts
    - src/__tests__/components/draft-card.test.tsx
    - src/__tests__/components/draft-editor.test.tsx
  modified:
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "Send endpoint always creates fresh Gmail draft from DB content (never sends stale Gmail draft)"
  - "PUT only updates DB -- no Gmail sync on edit (send handles it fresh)"
  - "Gmail draft deletion is best-effort (catch and log, never block)"
  - "base-ui duplicate rendering handled with getAllByText + cleanup in tests"

patterns-established:
  - "Fresh-draft-on-send: always delete old + create new Gmail draft from DB before sending"
  - "Best-effort-cleanup: Gmail operations in dismiss/send catch errors without blocking"
  - "DraftCard/DraftEditor component pattern for future outreach UI features"

requirements-completed: [OUTR-04, OUTR-05, OUTR-06, OUTR-07, OUTR-08]

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 03 Plan 03: Draft Review Workflow Summary

**Human-in-the-loop draft review with send/edit/dismiss actions, fresh Gmail draft creation on send, and status-filtered dashboard**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T14:31:57Z
- **Completed:** 2026-03-19T14:40:18Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Complete draft CRUD API: list with contact join and status filter, update subject/body, dismiss with Gmail cleanup, send with fresh draft creation
- Send endpoint always creates fresh Gmail draft from current DB content, solving both the edit-before-send and failed-initial-sync cases uniformly
- Draft review dashboard at /drafts with DraftCard, DraftList, DraftEditor components and status filter tabs
- Sidebar navigation updated with Drafts item between Contacts and Settings
- 22 new tests (12 API, 10 component) all passing alongside 136 existing tests (158 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft CRUD and send API routes** - `40216ee` (feat, TDD)
2. **Task 2: Draft review dashboard page and UI components** - `6074165` (feat)

## Files Created/Modified
- `src/app/api/drafts/route.ts` - GET list drafts with contact join + status filter, POST stub
- `src/app/api/drafts/[id]/route.ts` - PUT update subject/body, DELETE dismiss with Gmail cleanup
- `src/app/api/drafts/[id]/send/route.ts` - POST always-fresh Gmail draft creation and send
- `src/app/(dashboard)/drafts/page.tsx` - Draft review page with status filter, send/edit/dismiss handlers
- `src/components/drafts/draft-card.tsx` - Card with contact info, sync status, action buttons
- `src/components/drafts/draft-list.tsx` - Grid list with loading skeletons and empty state
- `src/components/drafts/draft-editor.tsx` - Sheet editor with React Hook Form + Zod validation
- `src/app/(dashboard)/layout.tsx` - Added Drafts nav item with Mail icon
- `src/__tests__/api/drafts.test.ts` - 7 tests for GET/PUT/DELETE draft routes
- `src/__tests__/api/drafts-send.test.ts` - 5 tests for POST send route
- `src/__tests__/components/draft-card.test.tsx` - 5 tests for DraftCard
- `src/__tests__/components/draft-editor.test.tsx` - 5 tests for DraftEditor

## Decisions Made
- Send endpoint always creates fresh Gmail draft from DB content (OUTR-07 fix) -- never relies on stale Gmail draft state
- PUT only updates DB fields (subject, body) -- no Gmail sync needed since send always creates fresh
- Gmail draft deletion is best-effort (catch and log) -- never blocks the primary operation
- Used cleanup() in beforeEach for component tests to handle base-ui duplicate DOM element rendering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- base-ui shadcn v4 components render duplicate DOM elements (buttons, text) requiring getAllByText pattern and explicit cleanup between tests -- consistent with established Phase 2 decision

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Outreach engine complete: AI draft generation (03-02) feeds into human review workflow (03-03)
- Full loop operational: meeting processing -> contact extraction -> AI drafts -> human review -> Gmail send
- Ready for Phase 04 Intelligence Dashboard

## Self-Check: PASSED

All 12 created files verified on disk. Both task commits (40216ee, 6074165) verified in git log.

---
*Phase: 03-outreach-engine*
*Completed: 2026-03-19*
