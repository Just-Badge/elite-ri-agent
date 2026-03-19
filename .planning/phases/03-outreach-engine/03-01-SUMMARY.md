---
phase: 03-outreach-engine
plan: 01
subsystem: api, database
tags: [gmail, oauth2, mime, zod, supabase, rls, open-brain]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: OAuth tokens table, encryption module, admin Supabase client
provides:
  - outreach_drafts database table with RLS and status constraints
  - Gmail draft CRUD service (create/send/delete) with OAuth2 token refresh
  - MIME message builder for RFC 5322 compliant base64url messages
  - Open Brain context client with graceful fallback
  - Zod validation schemas for draft payloads
  - Gmail and Open Brain TypeScript type definitions
affects: [03-outreach-engine]

# Tech tracking
tech-stack:
  added: [mimetext, "@googleapis/gmail", google-auth-library]
  patterns: [gmail-oauth2-token-refresh, graceful-fallback-client, mime-builder]

key-files:
  created:
    - supabase/migrations/00008_create_outreach_drafts.sql
    - src/lib/validations/drafts.ts
    - src/lib/gmail/client.ts
    - src/lib/gmail/mime.ts
    - src/lib/gmail/types.ts
    - src/lib/open-brain/client.ts
    - src/lib/open-brain/types.ts
    - src/__tests__/gmail/mime.test.ts
    - src/__tests__/gmail/client.test.ts
    - src/__tests__/open-brain/client.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "mimetext requires From header; use placeholder 'me@gmail.com' since Gmail API replaces it with authenticated user"
  - "OAuth2 token refresh handler persists both access and refresh tokens to oauth_tokens table on token event"
  - "Open Brain client uses try/catch returning empty string -- never throws, graceful when table does not exist"
  - "Used function constructors for @googleapis/gmail mocks (not mockImplementation) for new-able compatibility"

patterns-established:
  - "Gmail service: getGmailClient abstracts OAuth2 setup + token persistence for all Gmail operations"
  - "Graceful fallback: fetchOpenBrainContext never throws, returns '' on any error including missing table"

requirements-completed: [OUTR-04, OUTR-05, OUTR-08, OBRN-01]

# Metrics
duration: 7min
completed: 2026-03-19
---

# Phase 03 Plan 01: Outreach Infra Foundations Summary

**Gmail CRUD service with OAuth2 token refresh, MIME builder, outreach_drafts table with RLS, and Open Brain context client with graceful fallback**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-19T14:09:52Z
- **Completed:** 2026-03-19T14:17:44Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- outreach_drafts table with 4 RLS policies, 4 indexes, and CHECK constraints for status and gmail_sync_status
- Gmail service module with OAuth2 token refresh that automatically persists new tokens
- MIME message builder producing RFC 5322 compliant base64url strings for Gmail API
- Open Brain context client that gracefully falls back to empty string when table doesn't exist
- Zod schemas for draft creation and update validation
- 15 new tests (5 MIME, 6 Gmail client, 4 Open Brain) all passing alongside 97 existing tests (112 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, Zod schemas, and MIME builder** - `cd71a15` (feat)
2. **Task 2: Gmail service client with OAuth2 token refresh** - `a553b5e` (feat)
3. **Task 3: Open Brain context client with graceful fallback** - `8444fe4` (feat)

## Files Created/Modified
- `supabase/migrations/00008_create_outreach_drafts.sql` - outreach_drafts table with RLS, CHECK constraints, 4 indexes
- `src/lib/validations/drafts.ts` - Zod schemas: outreachDraftSchema, draftUpdateSchema, DRAFT_STATUSES, DraftStatus
- `src/lib/gmail/types.ts` - GmailDraftResult, GmailSendResult interfaces
- `src/lib/gmail/mime.ts` - buildMimeMessage producing base64url for Gmail API raw field
- `src/lib/gmail/client.ts` - getGmailClient, createGmailDraft, sendGmailDraft, deleteGmailDraft
- `src/lib/open-brain/types.ts` - OpenBrainNote, OpenBrainContext interfaces
- `src/lib/open-brain/client.ts` - fetchOpenBrainContext with graceful fallback
- `src/__tests__/gmail/mime.test.ts` - 5 MIME builder tests
- `src/__tests__/gmail/client.test.ts` - 6 Gmail client tests with full mock coverage
- `src/__tests__/open-brain/client.test.ts` - 4 Open Brain tests including error handling

## Decisions Made
- **mimetext From header:** mimetext library requires a From header; used placeholder "me@gmail.com" since Gmail API replaces it with the authenticated user's address
- **OAuth2 token persistence:** Token refresh handler encrypts and persists both access_token and refresh_token to oauth_tokens table on token event, using separate admin client instance
- **Open Brain graceful fallback:** Entire function wrapped in try/catch returning empty string; handles missing table, empty results, and connection errors without throwing
- **Mock constructors:** Used function constructors instead of mockImplementation for @googleapis/gmail mocks to support `new` operator in tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mimetext requires From header for message generation**
- **Found during:** Task 1 (MIME builder)
- **Issue:** mimetext throws MIMETEXT_MISSING_HEADER when no From is set, but plan specified "works without From header"
- **Fix:** Always set From to placeholder "me@gmail.com" when no from parameter provided; Gmail API overrides From with authenticated sender
- **Files modified:** src/lib/gmail/mime.ts
- **Verification:** All 5 MIME tests pass
- **Committed in:** cd71a15 (Task 1 commit)

**2. [Rule 1 - Bug] MIME test assertions used plain text format instead of RFC 5322 encoded format**
- **Found during:** Task 1 (MIME builder)
- **Issue:** Tests expected "To: email@example.com" but mimetext wraps in angle brackets and base64-encodes Subject per RFC 2047
- **Fix:** Updated test assertions to use regex matching that accounts for RFC-compliant formatting
- **Files modified:** src/__tests__/gmail/mime.test.ts
- **Verification:** All MIME tests pass with correct RFC 5322 output
- **Committed in:** cd71a15 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. The MIME library's RFC compliance requirements are standard behavior. No scope creep.

## Issues Encountered
- npm install dropped devDependencies between tasks (requires NODE_ENV=development); resolved by re-running install with correct NODE_ENV
- @googleapis/gmail mock needed function constructor pattern instead of vi.fn().mockImplementation() to support `new` operator

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Outreach infrastructure complete: database table, Gmail service, MIME builder, Open Brain client, validation schemas
- Ready for Plan 02 (AI draft generation) and Plan 03 (outreach API/UI)
- Gmail service depends on GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars already configured in Phase 1

---
*Phase: 03-outreach-engine*
*Completed: 2026-03-19*
