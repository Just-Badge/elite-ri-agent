---
phase: 02-data-pipeline-contacts
plan: 04
subsystem: api, ui
tags: [next-api-routes, zod-validation, supabase-rls, contacts-crud, shadcn-card, search, filter, date-fns]

# Dependency graph
requires:
  - phase: 02-data-pipeline-contacts
    plan: 01
    provides: "contacts/meetings/action_items tables with RLS, Zod validation schemas (contactSchema, contactUpdateSchema)"
provides:
  - "Contact CRUD API routes (list, detail, create, update, delete) with auth and Zod validation"
  - "Action item toggle API endpoint"
  - "Contact list page with search, category filter, and card-based grid layout"
  - "ContactCard component for list view"
  - "Sidebar navigation with Contacts link"
affects: [02-05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["API route pattern: createClient -> getUser -> auth check -> Zod parse -> supabase query -> NextResponse.json", "client page with debounced search and category filter", "ContactCard with status dot, category badge, relative date"]

key-files:
  created:
    - src/app/api/contacts/route.ts
    - src/app/api/contacts/[id]/route.ts
    - src/app/api/contacts/[id]/action-items/route.ts
    - src/__tests__/api/contacts.test.ts
    - src/app/(dashboard)/contacts/page.tsx
    - src/components/contacts/contact-card.tsx
    - src/__tests__/components/contact-card.test.tsx
  modified:
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "Used contactUpdateSchema with UUID validation for PUT /api/contacts/[id] -- params.id validated as UUID by Zod"
  - "Used formatDistanceToNow from date-fns for relative interaction dates in ContactCard"
  - "Badge test uses getAllByText due to base-ui useRender creating duplicate DOM elements"

patterns-established:
  - "Contact API route pattern: auth check, Zod validation, supabase query with user_id scoping, ZodError catch for 400"
  - "Client page pattern: useCallback + debounced useEffect for search, Select for filter, grid layout with loading/empty states"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07]

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 02 Plan 04: Contact CRUD API + List Page Summary

**Contact CRUD API routes with Zod validation, search/filter support, and card-based list page with debounced search and category dropdown**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T12:10:52Z
- **Completed:** 2026-03-19T12:16:50Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- 3 API route files providing full contact CRUD (list, detail, create, update, delete) plus action item toggle, all with auth and Zod validation
- Contact list page at /contacts with debounced search (300ms), category filter dropdown, skeleton loading states, and empty state messaging
- ContactCard component displaying name, email, company, category badge, status indicator, action item count, and relative interaction date
- Sidebar navigation updated with Contacts link between Dashboard and Settings

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing Contact CRUD API tests** - `7bb3f88` (test)
2. **Task 1 GREEN: Implement Contact CRUD API routes** - `8ee3d17` (feat)
3. **Task 2 RED: Add failing ContactCard tests** - `590f202` (test)
4. **Task 2 GREEN: Implement contact list page with card layout** - `e840877` (feat)

_Note: TDD tasks have RED (failing tests) and GREEN (implementation) commits_

## Files Created/Modified
- `src/app/api/contacts/route.ts` - GET (list with search/category filter) and POST (create with Zod validation) endpoints
- `src/app/api/contacts/[id]/route.ts` - GET (detail with joins), PUT (update with validation), DELETE endpoints
- `src/app/api/contacts/[id]/action-items/route.ts` - PUT endpoint to toggle action item completed status
- `src/__tests__/api/contacts.test.ts` - 10 unit tests for all Contact CRUD operations and auth checks
- `src/app/(dashboard)/contacts/page.tsx` - Contact list page with search, category filter, grid layout
- `src/components/contacts/contact-card.tsx` - Card component with name, email, company, category badge, status dot, action items count
- `src/__tests__/components/contact-card.test.tsx` - 5 tests for ContactCard rendering
- `src/app/(dashboard)/layout.tsx` - Added Contacts nav item with Users icon

## Decisions Made
- Used `contactUpdateSchema` with UUID validation for PUT routes -- the `id` param is validated as a proper UUID by Zod, ensuring type safety
- Used `formatDistanceToNow` from date-fns (already in dependencies) for human-readable relative dates in ContactCard
- Badge test adapted to use `getAllByText` because shadcn v4's base-ui `useRender` pattern creates duplicate DOM elements for the same text content

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UUID validation in PUT test**
- **Found during:** Task 1 GREEN (Contact CRUD implementation)
- **Issue:** Test used "c1" as contact ID but `contactUpdateSchema` validates `id` as `z.string().uuid()`, causing 400 response
- **Fix:** Changed test to use valid UUID `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- **Files modified:** src/__tests__/api/contacts.test.ts
- **Verification:** PUT test now passes with valid UUID
- **Committed in:** 8ee3d17 (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Fixed Badge duplicate rendering in tests**
- **Found during:** Task 2 GREEN (ContactCard implementation)
- **Issue:** `screen.getByText("investors")` threw "Found multiple elements" because base-ui `useRender` creates duplicate span elements
- **Fix:** Changed test to use `screen.getAllByText` and verify at least one element has `data-slot="badge"`
- **Files modified:** src/__tests__/components/contact-card.test.tsx
- **Verification:** Badge test passes, correctly identifies badge element
- **Committed in:** e840877 (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Contact CRUD API routes ready for contact detail page (plan 02-05)
- ContactCard component reusable for any contact list views
- Search and filter patterns established for reuse in other list views

## Self-Check: PASSED

- All 8 files verified on disk
- All 4 commit hashes (7bb3f88, 8ee3d17, 590f202, e840877) verified in git log
- 10/10 API tests passing
- 5/5 ContactCard tests passing

---
*Phase: 02-data-pipeline-contacts*
*Completed: 2026-03-19*
