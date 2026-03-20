---
phase: 05-onboarding-first-impressions
plan: 02
subsystem: ui
tags: [react, empty-state, skeleton, loading, ux, lucide-react]

# Dependency graph
requires:
  - phase: 04-dashboard-intelligence
    provides: dashboard widgets (risk-contacts, triage-contacts, pending-actions, outreach-analytics)
provides:
  - Reusable EmptyState component with icon, heading, description, optional CTA, and compact mode
  - Unified empty state pattern across all 6 locations in the app
  - Shape-matched skeleton loading for contact detail and dashboard pages
affects: [05-onboarding-first-impressions, 08-accessibility-mobile]

# Tech tracking
tech-stack:
  added: []
  patterns: [EmptyState component with compact mode for widget vs page contexts, Base UI render prop for Button-as-Link composition]

key-files:
  created:
    - src/components/ui/empty-state.tsx
  modified:
    - src/app/(dashboard)/contacts/page.tsx
    - src/components/drafts/draft-list.tsx
    - src/components/dashboard/risk-contacts.tsx
    - src/components/dashboard/triage-contacts.tsx
    - src/components/dashboard/pending-actions.tsx
    - src/components/dashboard/outreach-analytics.tsx
    - src/components/contacts/contact-detail.tsx
    - src/app/(dashboard)/dashboard/page.tsx

key-decisions:
  - "Used Base UI render prop pattern (render={<Link />}) instead of asChild for Button-as-Link composition"
  - "EmptyState compact mode uses <p> for heading instead of <h3> to avoid heading hierarchy issues inside widget cards"

patterns-established:
  - "EmptyState component: all empty list states use EmptyState with icon + heading + description + optional CTA"
  - "Compact mode: dashboard widgets use compact=true, full pages use default (compact=false)"
  - "Skeleton shape-matching: skeleton height values match actual rendered component heights"

requirements-completed: [ONBD-04, ONBD-06]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 05 Plan 02: Unified Empty States & Skeleton Loading Summary

**Reusable EmptyState component replacing 6 inconsistent empty states, plus shape-matched Skeleton loading for contact detail and dashboard**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T20:30:50Z
- **Completed:** 2026-03-20T20:34:49Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created reusable EmptyState component with icon, heading, description, optional CTA button, and compact mode
- Replaced all 6 empty state locations with unified EmptyState (contacts page, drafts list, risk-contacts, triage-contacts, pending-actions, outreach-analytics)
- Fixed contact detail loading to use Skeleton components instead of raw animate-pulse divs
- Improved dashboard page skeletons to be shape-matched (106px stat cards, 300px widget cards)
- Added contextual CTAs: contacts page links to Process Meetings, drafts links to Set Up Outreach Schedule

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unified EmptyState component and replace all page empty states** - `eefc894` (feat)
2. **Task 2: Replace dashboard widget empty states and fix all skeleton loading states** - `82abf60` (feat)

## Files Created/Modified
- `src/components/ui/empty-state.tsx` - Reusable EmptyState component with compact mode support
- `src/app/(dashboard)/contacts/page.tsx` - Contextual empty state (filtered vs unfiltered with CTA)
- `src/components/drafts/draft-list.tsx` - Empty state with "Set Up Outreach Schedule" CTA
- `src/components/dashboard/risk-contacts.tsx` - Compact EmptyState replacing inline CheckCircle pattern
- `src/components/dashboard/triage-contacts.tsx` - Compact EmptyState replacing inline CheckCircle pattern
- `src/components/dashboard/pending-actions.tsx` - Compact EmptyState replacing inline CheckCircle pattern
- `src/components/dashboard/outreach-analytics.tsx` - Compact EmptyState replacing inline BarChart3 pattern
- `src/components/contacts/contact-detail.tsx` - Shape-matched Skeleton loading replacing animate-pulse divs
- `src/app/(dashboard)/dashboard/page.tsx` - Improved skeleton heights matching actual component dimensions

## Decisions Made
- Used Base UI render prop pattern (`render={<Link />}`) instead of `asChild` for Button-as-Link composition -- consistent with existing codebase patterns
- EmptyState compact mode uses `<p>` for heading instead of `<h3>` to avoid heading hierarchy issues inside widget cards that already have `<CardTitle>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Button-as-Link composition pattern**
- **Found during:** Task 1 (EmptyState component creation)
- **Issue:** Initially used `asChild` prop which is a Radix UI pattern, but project uses Base UI with `render` prop pattern
- **Fix:** Changed to `render={<Link href={action.href} />}` pattern matching existing codebase usage
- **Files modified:** src/components/ui/empty-state.tsx
- **Verification:** Matches pattern used in layout.tsx SidebarMenuButton
- **Committed in:** eefc894 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Auto-fix necessary for correctness with Base UI component library. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All empty states unified across the app
- EmptyState component available for any future pages/widgets
- Skeleton loading patterns established for contact detail and dashboard
- Ready for Phase 05 Plan 03

## Self-Check: PASSED

- [x] src/components/ui/empty-state.tsx exists
- [x] 05-02-SUMMARY.md exists
- [x] Commit eefc894 found
- [x] Commit 82abf60 found

---
*Phase: 05-onboarding-first-impressions*
*Completed: 2026-03-20*
