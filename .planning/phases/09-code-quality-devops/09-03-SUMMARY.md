---
phase: 09-code-quality-devops
plan: 03
subsystem: api
tags: [error-handling, ci-cd, github-actions, nextresponse, standardization]

# Dependency graph
requires:
  - phase: 09-02
    provides: "Standardized API error response helpers (apiError, apiUnauthorized, apiNotFound, apiBadRequest, apiValidationError)"
provides:
  - "All 14 API routes using standardized error helpers with zero inline error patterns"
  - "GitHub Actions CI pipeline running lint, type check, build, and test on push/PR"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All API routes use error helpers from @/lib/api/errors instead of inline NextResponse.json({ error })"
    - "CI pipeline validates every push with lint + tsc + build + test"

key-files:
  created:
    - .github/workflows/ci.yml
  modified:
    - src/app/api/contacts/route.ts
    - src/app/api/contacts/[id]/route.ts
    - src/app/api/contacts/[id]/action-items/route.ts
    - src/app/api/drafts/route.ts
    - src/app/api/drafts/[id]/route.ts
    - src/app/api/drafts/[id]/send/route.ts
    - src/app/api/dashboard/stats/route.ts
    - src/app/api/dashboard/analytics/route.ts
    - src/app/api/settings/profile/route.ts
    - src/app/api/settings/api-key/route.ts
    - src/app/api/settings/schedule/route.ts
    - src/app/api/meetings/process/route.ts
    - src/app/api/granola/token/route.ts
    - src/app/api/onboarding/status/route.ts

key-decisions:
  - "Preserved original error messages in apiError/apiBadRequest calls for backward compatibility"
  - "Simplified meetings/process error catch to use apiError with generic message since details field was non-standard"

patterns-established:
  - "API error responses: always use helpers from @/lib/api/errors, never inline NextResponse.json({ error })"

requirements-completed: [QUAL-05, QUAL-07]

# Metrics
duration: 6min
completed: 2026-03-21
---

# Phase 09 Plan 03: API Route Migration & CI Pipeline Summary

**Migrated all 14 API routes to standardized error helpers and created GitHub Actions CI pipeline with lint, type check, build, and test steps**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T00:27:18Z
- **Completed:** 2026-03-21T00:33:58Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Migrated all 14 API route files to use standardized error helpers, eliminating every inline `NextResponse.json({ error })` pattern
- Created GitHub Actions CI pipeline that runs lint, type check (tsc --noEmit), build, and test on every push to main/master and on PRs
- All 201 tests pass after migration, confirming error response body shape is preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate all 14 API routes to use error helpers** - `2ced638` (refactor)
2. **Task 2: Create GitHub Actions CI/CD pipeline** - `18219a1` (chore)

## Files Created/Modified
- `.github/workflows/ci.yml` - CI pipeline with lint, tsc, build, test steps and placeholder env vars
- `src/app/api/contacts/route.ts` - Replaced 4 inline error patterns with apiUnauthorized, apiError, apiValidationError, apiBadRequest
- `src/app/api/contacts/[id]/route.ts` - Replaced 7 inline error patterns including apiNotFound for PGRST116
- `src/app/api/contacts/[id]/action-items/route.ts` - Replaced 3 inline error patterns
- `src/app/api/drafts/route.ts` - Replaced 3 inline error patterns including 501 Not Implemented
- `src/app/api/drafts/[id]/route.ts` - Replaced 5 inline error patterns across PUT and DELETE
- `src/app/api/drafts/[id]/send/route.ts` - Replaced 4 inline error patterns with apiNotFound, apiBadRequest
- `src/app/api/dashboard/stats/route.ts` - Replaced 2 inline error patterns
- `src/app/api/dashboard/analytics/route.ts` - Replaced 2 inline error patterns
- `src/app/api/settings/profile/route.ts` - Replaced 5 inline error patterns across GET and PUT
- `src/app/api/settings/api-key/route.ts` - Replaced 6 inline error patterns across GET, PUT, DELETE
- `src/app/api/settings/schedule/route.ts` - Replaced 6 inline error patterns including custom validation messages
- `src/app/api/meetings/process/route.ts` - Replaced 2 inline error patterns
- `src/app/api/granola/token/route.ts` - Replaced 5 inline error patterns across POST and GET
- `src/app/api/onboarding/status/route.ts` - Replaced 3 inline error patterns

## Decisions Made
- Preserved original error messages when migrating to helpers (e.g., "Contact not found", "End hour must be greater than start hour") for backward compatibility
- Simplified meetings/process error catch to use apiError with generic message since the original included a non-standard `details` field
- CI pipeline uses placeholder env vars that satisfy env validation module checks without requiring real credentials

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All API routes now use consistent error response patterns
- CI pipeline will validate code quality on every push/PR once pushed to GitHub
- Phase 09 (Code Quality & DevOps) is complete with all 3 plans executed

## Self-Check: PASSED

All 15 modified/created files verified on disk. Both task commits (2ced638, 18219a1) verified in git log. Zero inline error patterns remain. All 14 route files import from @/lib/api/errors.

---
*Phase: 09-code-quality-devops*
*Completed: 2026-03-21*
