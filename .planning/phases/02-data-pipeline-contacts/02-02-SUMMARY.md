---
phase: 02-data-pipeline-contacts
plan: 02
subsystem: api, ai
tags: [granola, workos, openai, z-ai, glm-5, token-rotation, contact-extraction, zod]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "Supabase admin client, AES-256-GCM encryption/decryption, user_settings table"
provides:
  - "Granola HTTP API client with WorkOS single-use token rotation"
  - "AI contact extraction from transcripts via z.ai GLM-5"
  - "Granola API response types (GranolaDocument, GranolaTranscriptSegment, GranolaTokens)"
  - "AI extraction types and Zod schemas (ExtractedContact, ExtractionResult)"
affects: [02-03-PLAN, 02-04-PLAN, 02-05-PLAN]

# Tech tracking
tech-stack:
  added: [openai]
  patterns: [workos-token-rotation, openai-baseurl-override, zod-ai-response-validation]

key-files:
  created:
    - src/lib/granola/client.ts
    - src/lib/granola/types.ts
    - src/lib/ai/extract-contacts.ts
    - src/lib/ai/types.ts
    - src/__tests__/granola/client.test.ts
    - src/__tests__/ai/extract-contacts.test.ts
  modified:
    - package.json

key-decisions:
  - "Used direct openai package with baseURL override for z.ai GLM-5 (not AI SDK provider) because z.ai is a third-party OpenAI-compatible endpoint requiring explicit baseURL control"
  - "v1 always refreshes access token on each call since only refresh tokens are stored (access tokens not cached)"
  - "Used vi.hoisted() for OpenAI mock to handle Vitest mock hoisting with constructor functions"

patterns-established:
  - "WorkOS token rotation: persist new refresh token BEFORE returning from refresh function"
  - "OpenAI SDK baseURL override: new OpenAI({ apiKey, baseURL }) for non-OpenAI endpoints"
  - "AI structured output: response_format json_object + Zod schema validation"

requirements-completed: [DATA-01, DATA-03, DATA-04, DATA-05, DATA-06, DATA-08]

# Metrics
duration: 6min
completed: 2026-03-19
---

# Phase 02 Plan 02: Granola API Client & AI Contact Extraction Summary

**Granola HTTP client with WorkOS single-use token rotation and z.ai GLM-5 contact extraction via OpenAI SDK with Zod-validated structured JSON output**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-19T12:01:39Z
- **Completed:** 2026-03-19T12:07:12Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Granola API client handles WorkOS OAuth token rotation with critical persist-before-return pattern for single-use refresh tokens
- AI extraction pipeline uses z.ai GLM-5 via OpenAI SDK baseURL override with structured JSON output and Zod validation
- Both modules fully tested with 15 unit tests (7 Granola + 8 AI extraction), full suite at 51 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Granola API client with WorkOS token rotation (TDD RED)** - `1d1f172` (test)
2. **Task 1: Granola API client with WorkOS token rotation (TDD GREEN)** - `0ca7e26` (feat)
3. **Task 2: AI contact extraction (TDD RED)** - `1ac3e43` (test)
4. **Task 2: AI contact extraction (TDD GREEN)** - `a7663ee` (feat)

_Note: TDD tasks have separate test and implementation commits_

## Files Created/Modified
- `src/lib/granola/types.ts` - GranolaTokens, GranolaDocument, GranolaDocumentsResponse, GranolaTranscriptSegment types
- `src/lib/granola/client.ts` - refreshGranolaToken, getOrRefreshAccessToken, getGranolaDocuments, getGranolaTranscript
- `src/lib/ai/types.ts` - extractedContactSchema, contactExtractionSchema, ExtractedContact, ExtractionResult
- `src/lib/ai/extract-contacts.ts` - extractContactsFromTranscript using z.ai GLM-5
- `src/__tests__/granola/client.test.ts` - 7 tests for Granola API client
- `src/__tests__/ai/extract-contacts.test.ts` - 8 tests for AI contact extraction
- `package.json` - Added openai dependency

## Decisions Made
- Used direct `openai` package with baseURL override for z.ai GLM-5 rather than AI SDK provider -- z.ai is a third-party OpenAI-compatible endpoint requiring explicit baseURL control
- v1 implementation always refreshes access token on each call since only refresh tokens are persisted (no access token caching) -- acceptable because tasks run infrequently and access tokens last 1 hour
- Used `vi.hoisted()` with regular function (not arrow) for OpenAI constructor mock -- Vitest hoists `vi.mock` above variable declarations, and arrow functions cannot be used as constructors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed OpenAI mock constructor in AI extraction tests**
- **Found during:** Task 2 (AI extraction test implementation)
- **Issue:** Arrow function in `vi.fn().mockImplementation()` cannot be called with `new` keyword
- **Fix:** Changed to regular function expression for constructor compatibility
- **Files modified:** `src/__tests__/ai/extract-contacts.test.ts`
- **Verification:** All 8 AI extraction tests pass
- **Committed in:** `a7663ee` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test mock fix. No scope creep.

## Issues Encountered
None beyond the mock constructor issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Granola client ready for Trigger.dev pipeline consumption (Plan 03)
- AI extraction module ready for transcript processing in pipeline
- Both modules export clean interfaces documented in types files

## Self-Check: PASSED

All 7 created files verified on disk. All 4 task commits verified in git log.

---
*Phase: 02-data-pipeline-contacts*
*Completed: 2026-03-19*
