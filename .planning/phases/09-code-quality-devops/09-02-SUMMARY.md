---
phase: 09-code-quality-devops
plan: 02
subsystem: api
tags: [nextresponse, zod, env-validation, error-handling]

# Dependency graph
requires: []
provides:
  - "Standardized API error response helpers (apiError, apiUnauthorized, apiNotFound, apiBadRequest, apiValidationError)"
  - "Environment variable validation module with fail-fast on missing vars"
affects: [09-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "API error helpers returning NextResponse.json({ error }) with consistent shape"
    - "Fail-fast env validation collecting all missing vars before throwing"

key-files:
  created:
    - src/lib/api/errors.ts
    - src/lib/env.ts
    - src/__tests__/api/error-helpers.test.ts
    - src/__tests__/lib/env.test.ts
  modified: []

key-decisions:
  - "Collected all missing env vars before throwing rather than failing on first -- developer sees complete list"
  - "apiValidationError preserves ZodError.issues array in response body for structured client-side handling"

patterns-established:
  - "API error helpers: import { apiUnauthorized } from '@/lib/api/errors' instead of inline NextResponse.json({ error })"
  - "Env validation: import { env } from '@/lib/env' for typed access to validated environment variables"

requirements-completed: [QUAL-04, QUAL-06]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 09 Plan 02: Utility Modules Summary

**Standardized API error helpers and fail-fast environment variable validation module for consumption by Plan 03**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T00:12:55Z
- **Completed:** 2026-03-21T00:16:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created 5 API error response helpers with consistent `{ error: string }` JSON shape and correct HTTP status codes
- Created environment variable validation module that validates all 6 required vars on import with descriptive error messages listing all missing vars
- Full TDD coverage: 13 tests across both modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API error response helpers** - `0297f3e` (feat) - TDD: RED then GREEN
2. **Task 2: Create environment variable validation module** - `c1f1963` (feat) - TDD: RED then GREEN

## Files Created/Modified
- `src/lib/api/errors.ts` - API error response helpers (apiError, apiUnauthorized, apiNotFound, apiBadRequest, apiValidationError)
- `src/lib/env.ts` - Environment variable validation module with fail-fast on missing vars
- `src/__tests__/api/error-helpers.test.ts` - 9 tests for error helpers
- `src/__tests__/lib/env.test.ts` - 4 tests for env validation

## Decisions Made
- Collected all missing env vars before throwing rather than failing on first -- developer sees complete list at once
- apiValidationError preserves ZodError.issues array in response body for structured client-side error handling
- Did not wire env module into existing supabase/gmail/crypto files -- out of scope per plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both utility modules are ready for consumption by Plan 03 (API route migration)
- 14 API route files can now replace inline `NextResponse.json({ error })` with the standardized helpers
- Environment variables can be accessed via `env.THING` instead of `process.env.THING!`

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (0297f3e, c1f1963) verified in git log.

---
*Phase: 09-code-quality-devops*
*Completed: 2026-03-21*
