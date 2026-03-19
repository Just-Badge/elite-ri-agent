---
phase: 01-foundation-auth
plan: 01
subsystem: infra
tags: [nextjs, supabase, tailwind, shadcn, encryption, rls, vitest, trigger-dev, zod]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project
provides:
  - Next.js 15.5 app with standalone output for Docker/Coolify
  - Supabase SSR clients (browser, server, admin) with cookie handling
  - Auth middleware with session refresh using getUser()
  - AES-256-GCM encryption/decryption for API keys and OAuth tokens
  - Zod validation schemas for profile, API key, schedule, and OAuth forms
  - Database migrations with RLS policies for user_settings and oauth_tokens
  - Vitest test infrastructure with 5 passing encryption tests
  - shadcn/ui v4 component library (sidebar, card, dialog, sheet, etc.)
  - Trigger.dev SDK scaffold with example task
  - Dashboard layout with sidebar navigation
affects: [01-02-PLAN, 01-03-PLAN, 02-pipeline-ingestion, 03-outreach-ai, 04-dashboard-intelligence]

# Tech tracking
tech-stack:
  added: [next@15.5.13, react@19.1, @supabase/supabase-js@2, @supabase/ssr@0, zod@3, react-hook-form@7, @hookform/resolvers@5, zustand@5, date-fns@4, @trigger.dev/sdk@4, shadcn@4, tailwindcss@4, vitest@4, lucide-react, sonner]
  patterns: [supabase-ssr-cookies, getUser-not-getSession, aes-256-gcm-hex-format, rls-subselect-caching, route-group-layouts]

key-files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/crypto/encryption.ts
    - src/middleware.ts
    - src/lib/validations/settings.ts
    - src/lib/validations/auth.ts
    - supabase/migrations/00001_create_user_settings.sql
    - supabase/migrations/00002_create_oauth_tokens.sql
    - vitest.config.ts
    - src/__tests__/crypto/encryption.test.ts
    - trigger.config.ts
    - src/trigger/example.ts
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/(auth)/login/page.tsx
  modified:
    - package.json
    - next.config.ts
    - src/app/layout.tsx
    - src/app/page.tsx
    - .gitignore

key-decisions:
  - "Used render prop instead of asChild for shadcn v4 SidebarMenuButton (base-ui pattern)"
  - "Added maxDuration to trigger.config.ts as required by @trigger.dev/sdk v4"
  - "Dashboard page at /dashboard via (dashboard)/dashboard/page.tsx route structure"
  - "NODE_ENV=development required for npm install to include devDependencies"

patterns-established:
  - "Pattern 1: Supabase SSR - three client files (browser/server/admin) with cookie handling"
  - "Pattern 2: Middleware session refresh using getUser() with auth redirect to /login"
  - "Pattern 3: AES-256-GCM encryption with iv:authTag:ciphertext hex format"
  - "Pattern 4: RLS migration template with (select auth.uid()) subselect and user_id index"
  - "Pattern 5: Zod schema + z.infer type export pattern for form validation"

requirements-completed: [TNNT-01, TNNT-02, TNNT-03, AUTH-03, AUTH-04]

# Metrics
duration: 22min
completed: 2026-03-19
---

# Phase 01 Plan 01: Foundation Infrastructure Summary

**Next.js 15.5 scaffold with Supabase SSR auth, AES-256-GCM encryption, RLS-enforced database schema, shadcn/ui v4, and Vitest test infrastructure**

## Performance

- **Duration:** 22 min
- **Started:** 2026-03-19T05:40:44Z
- **Completed:** 2026-03-19T06:03:29Z
- **Tasks:** 2
- **Files modified:** 42

## Accomplishments
- Complete Next.js 15.5 app builds and serves with standalone output, Tailwind v4, and shadcn/ui v4
- Three Supabase client variants (browser, server, admin) with proper cookie handling and session refresh middleware
- AES-256-GCM encryption utility with 5 passing tests covering round-trip, tamper detection, random IV, and missing key
- Two database migrations with full RLS policies (4 CRUD policies each) using optimized subselect pattern
- Zod validation schemas for all three settings forms with TypeScript type exports
- Trigger.dev SDK scaffold ready for background job implementation in Phase 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project, install all dependencies, configure shadcn/ui, create Supabase clients, middleware, encryption, validation schemas, and env files** - `6b05528` (feat)
2. **Task 2: Create database migrations with RLS policies and Vitest test infrastructure** - `88c190c` (feat)

## Files Created/Modified
- `src/lib/supabase/client.ts` - Browser Supabase client with createBrowserClient
- `src/lib/supabase/server.ts` - Server Supabase client with async cookie handling
- `src/lib/supabase/admin.ts` - Service role Supabase client (server-only)
- `src/lib/crypto/encryption.ts` - AES-256-GCM encrypt/decrypt with hex format
- `src/middleware.ts` - Session refresh middleware with getUser() and auth redirect
- `src/lib/validations/settings.ts` - Zod schemas for profile, API key, schedule forms
- `src/lib/validations/auth.ts` - Zod schema for OAuth token data
- `supabase/migrations/00001_create_user_settings.sql` - user_settings table with RLS
- `supabase/migrations/00002_create_oauth_tokens.sql` - oauth_tokens table with RLS
- `vitest.config.ts` - Vitest config with jsdom, React plugin, and @ alias
- `src/__tests__/crypto/encryption.test.ts` - 5 encryption unit tests
- `trigger.config.ts` - Trigger.dev project configuration
- `src/trigger/example.ts` - Placeholder hello-world task
- `src/app/(dashboard)/layout.tsx` - Dashboard layout with sidebar navigation
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard placeholder page
- `src/app/(auth)/login/page.tsx` - Login page placeholder
- `next.config.ts` - Added standalone output for Docker/Coolify
- `src/app/layout.tsx` - Root layout with Toaster and TooltipProvider
- `src/app/page.tsx` - Root redirect to /dashboard
- `.env.example` - All required environment variables documented

## Decisions Made
- Used `render` prop instead of `asChild` for shadcn v4 SidebarMenuButton -- shadcn v4 uses @base-ui/react's useRender pattern instead of Radix's asChild
- Added `maxDuration: 300` to trigger.config.ts -- required property in @trigger.dev/sdk v4.4.3
- Used `authTagLength: AUTH_TAG_LENGTH` in createCipheriv options to use the constant explicitly and satisfy ESLint
- Placed dashboard page at `(dashboard)/dashboard/page.tsx` so it maps to `/dashboard` URL path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] NODE_ENV=production causing devDependencies to be skipped**
- **Found during:** Task 1 (npm install)
- **Issue:** NODE_ENV was set to production in the shell environment, causing npm to skip devDependencies (@tailwindcss/postcss, vitest, etc.)
- **Fix:** Used NODE_ENV=development for npm install commands
- **Files modified:** None (runtime fix)
- **Verification:** @tailwindcss/postcss installed, build succeeds

**2. [Rule 1 - Bug] shadcn v4 uses render prop, not asChild**
- **Found during:** Task 1 (build verification)
- **Issue:** SidebarMenuButton in shadcn v4 uses @base-ui/react's useRender pattern. The `asChild` prop from Radix does not exist.
- **Fix:** Changed `<SidebarMenuButton asChild><a>` to `<SidebarMenuButton render={<a />}>`
- **Files modified:** src/app/(dashboard)/layout.tsx
- **Verification:** Build succeeds without type errors

**3. [Rule 1 - Bug] AUTH_TAG_LENGTH unused variable lint error**
- **Found during:** Task 1 (build verification)
- **Issue:** ESLint flagged AUTH_TAG_LENGTH as unused -- it was declared but not referenced in code
- **Fix:** Passed AUTH_TAG_LENGTH as authTagLength option to createCipheriv
- **Files modified:** src/lib/crypto/encryption.ts
- **Verification:** Lint passes, encryption tests still pass

**4. [Rule 3 - Blocking] Trigger.dev SDK v4 requires maxDuration**
- **Found during:** Task 1 (build verification)
- **Issue:** defineConfig() requires maxDuration property in @trigger.dev/sdk v4.4.3
- **Fix:** Added `maxDuration: 300` (5 minutes default)
- **Files modified:** trigger.config.ts
- **Verification:** Build succeeds

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking)
**Impact on plan:** All fixes necessary for build success. No scope creep.

## Issues Encountered
- npm with NODE_ENV=production silently skips devDependencies -- no error, just missing packages. Required discovering via verbose logging and testing in clean directory.

## User Setup Required
None - no external service configuration required for this plan. Supabase project connection and Google OAuth setup are handled in Plan 02.

## Next Phase Readiness
- Foundation infrastructure complete, ready for auth flow implementation (Plan 02)
- Database migrations ready for Supabase deployment
- Encryption utilities tested and available for OAuth token storage
- All validation schemas in place for settings forms (Plan 03)

## Self-Check: PASSED

All 16 created files verified on disk. Both task commits (6b05528, 88c190c) verified in git log.

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-19*
