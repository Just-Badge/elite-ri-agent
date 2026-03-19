---
phase: 01-foundation-auth
plan: 02
subsystem: auth
tags: [google-oauth, supabase-auth, provider-tokens, aes-256-gcm, refresh-token, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-auth/01
    provides: Supabase client utilities (client.ts, server.ts, admin.ts), encryption (encryption.ts), middleware, shadcn components
provides:
  - GoogleSignInButton component with signInWithOAuth (gmail.compose, gmail.send scopes, offline access, forced consent)
  - OAuth callback route handler with code exchange, provider token capture, encryption, and upsert to oauth_tokens
  - Login page at /login with error handling for auth_callback_failed
  - Auth test suite (8 tests covering token capture, sign-in flow, error cases)
affects: [01-foundation-auth/03, 02-meeting-pipeline, 03-outreach]

# Tech tracking
tech-stack:
  added: []
  patterns: [vi.hoisted mock pattern for vitest, Suspense boundary for useSearchParams]

key-files:
  created:
    - src/components/auth/google-sign-in-button.tsx
    - src/app/(auth)/auth/callback/route.ts
    - src/__tests__/auth/token-capture.test.ts
    - src/__tests__/auth/oauth-flow.test.tsx
  modified:
    - src/app/(auth)/login/page.tsx
    - vitest.config.ts

key-decisions:
  - "Used admin client (service role) for oauth_tokens upsert because RLS session may not be fully established during callback"
  - "Added Suspense boundary around LoginContent to support useSearchParams in static generation"
  - "Added NODE_ENV=test define in vitest config for React 19 act() compatibility"

patterns-established:
  - "vi.hoisted() pattern: use vi.hoisted to declare mock variables accessible inside vi.mock factory functions"
  - "Suspense boundary: wrap any client component using useSearchParams in Suspense for Next.js static generation"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 11min
completed: 2026-03-19
---

# Phase 01 Plan 02: Google OAuth Sign-In Flow Summary

**Google OAuth sign-in with gmail.compose/gmail.send scopes, provider token capture and AES-256-GCM encryption into oauth_tokens, and user_settings auto-creation on first login**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-19T06:08:10Z
- **Completed:** 2026-03-19T06:19:01Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Complete Google OAuth flow: login page with branded card UI, sign-in button triggering Supabase OAuth with Gmail scopes
- OAuth callback route that exchanges code for session, captures provider_token and provider_refresh_token, encrypts both with AES-256-GCM, and upserts to oauth_tokens via admin client
- Error handling with redirect to /login?error=auth_callback_failed for failed code exchange or missing code param
- 8 new tests covering token capture (5 tests) and sign-in component behavior (3 tests), all passing alongside existing 14 tests (22 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Google OAuth sign-in button, login page, and callback route** - `0b68fd9` (feat)
2. **Task 2: Create unit tests for OAuth callback token capture and sign-in flow** - `79f44b2` (test)

## Files Created/Modified
- `src/components/auth/google-sign-in-button.tsx` - Client component with signInWithOAuth, loading state, gmail.compose/gmail.send scopes, access_type=offline, prompt=consent
- `src/app/(auth)/login/page.tsx` - Login page with ELITE branding, GoogleSignInButton, auth_callback_failed error display, Suspense boundary
- `src/app/(auth)/auth/callback/route.ts` - GET route handler: code exchange, provider token capture, encryption, oauth_tokens upsert, user_settings creation
- `src/__tests__/auth/token-capture.test.ts` - 5 tests for callback route: token capture, null refresh token, error redirect, no code, user_settings creation
- `src/__tests__/auth/oauth-flow.test.tsx` - 3 tests for GoogleSignInButton: renders, correct OAuth params, loading state
- `vitest.config.ts` - Added NODE_ENV=test define for React 19 act() compatibility

## Decisions Made
- Used admin client (service role) for oauth_tokens upsert because RLS INSERT policy requires auth.uid() = user_id, but the cookie-based session may not be fully established during callback processing
- Wrapped LoginContent in Suspense boundary because useSearchParams requires it for Next.js static page generation
- Added process.env.NODE_ENV = "test" define in vitest config to resolve React 19's React.act() being undefined in production CJS bundle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added Suspense boundary for useSearchParams**
- **Found during:** Task 1 (Login page update)
- **Issue:** Next.js build failed because useSearchParams() requires a Suspense boundary at page "/login" for static generation
- **Fix:** Extracted login content into LoginContent component, wrapped in Suspense in the default export
- **Files modified:** src/app/(auth)/login/page.tsx
- **Verification:** npm run build succeeds
- **Committed in:** 0b68fd9 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed React.act not found in vitest/jsdom environment**
- **Found during:** Task 2 (Component tests)
- **Issue:** @testing-library/react uses React.act() which is undefined in React 19 production CJS bundle loaded by vitest jsdom
- **Fix:** Added `define: { "process.env.NODE_ENV": '"test"' }` to vitest.config.ts so React loads the development bundle with act() available
- **Files modified:** vitest.config.ts
- **Verification:** All 22 tests pass
- **Committed in:** 79f44b2 (Task 2 commit)

**3. [Rule 3 - Blocking] Fixed vi.mock hoisting issue**
- **Found during:** Task 2 (Test setup)
- **Issue:** Variables declared before vi.mock factories cannot be accessed because vi.mock is hoisted to top of file
- **Fix:** Used vi.hoisted() to declare mock variables that are accessible inside vi.mock factory functions
- **Files modified:** src/__tests__/auth/token-capture.test.ts, src/__tests__/auth/oauth-flow.test.tsx
- **Verification:** All tests pass
- **Committed in:** 79f44b2 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for build and test infrastructure correctness. No scope creep.

## Issues Encountered
- Next.js Turbopack build had ENOENT errors for _buildManifest.js.tmp -- worked around by using webpack build (npx next build without --turbopack)

## User Setup Required

**External services require manual configuration.** See plan frontmatter `user_setup` section for:
- Supabase project: Enable Google OAuth provider, set client ID/secret, add redirect URL
- Google Cloud: Create OAuth credentials, enable Gmail API, configure consent screen with gmail.compose/gmail.send scopes
- Environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (plus existing Supabase and ENCRYPTION_KEY vars from Plan 01)

## Next Phase Readiness
- Auth flow is fully implemented and tested, ready for end-to-end testing once Supabase and Google Cloud are configured
- Plan 03 (settings pages) can proceed -- user_settings row is auto-created on first login
- Phase 2 (meeting pipeline) can access Gmail via encrypted tokens stored in oauth_tokens table

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-19*
