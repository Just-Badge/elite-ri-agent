---
phase: 05-onboarding-first-impressions
plan: 03
subsystem: ui
tags: [react, onboarding, wizard, dialog, collapsible, sidebar, base-ui]

# Dependency graph
requires:
  - phase: 05-onboarding-first-impressions
    provides: ThemeProvider, ThemeToggle in sidebar footer (plan 01), EmptyState component and skeletons (plan 02)
provides:
  - OnboardingWizard multi-step dialog for new user setup
  - SetupChecklist sidebar component tracking onboarding progress
  - Onboarding status API detecting Granola, profile, and contacts completion
  - Collapsible accordion Granola instructions with inline error and retry
affects: [06-safety-trust, 07-navigation-findability, 08-accessibility-mobile]

# Tech tracking
tech-stack:
  added: [collapsible (base-ui via shadcn)]
  patterns: [Multi-step wizard dialog pattern, localStorage-gated one-time wizard, sidebar progress checklist]

key-files:
  created:
    - src/lib/onboarding.ts
    - src/app/api/onboarding/status/route.ts
    - src/components/onboarding/onboarding-wizard.tsx
    - src/components/onboarding/setup-checklist.tsx
    - src/components/onboarding/wizard-steps.tsx
    - src/components/ui/collapsible.tsx
  modified:
    - src/components/settings/granola-token-form.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "Adapted profile detection from plan's company/role to actual personality_profile field matching real schema"
  - "Used localStorage elite_onboarding_dismissed key to prevent wizard re-appearing after skip/close"
  - "Wizard steps are filtered at render time based on onboardingStatus, skipping completed steps"

patterns-established:
  - "Onboarding wizard: multi-step Dialog with filtered steps array, each step receives onNext/onSkip callbacks"
  - "Sidebar checklist: client component fetching status on mount, auto-hides when is_complete is true"
  - "Collapsible instructions: CollapsibleTrigger with ChevronDown rotation, CollapsibleContent for expandable details"

requirements-completed: [ONBD-01, ONBD-02, ONBD-03]

# Metrics
duration: 7min
completed: 2026-03-20
---

# Phase 05 Plan 03: Onboarding Wizard & Setup Checklist Summary

**Multi-step onboarding wizard dialog with sidebar progress checklist, onboarding status API, and collapsible Granola connection instructions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-20T20:37:50Z
- **Completed:** 2026-03-20T20:44:56Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- OnboardingWizard renders as a Dialog modal on dashboard for first-time users, walking through Welcome, Granola, Profile, and Process steps
- SetupChecklist in sidebar shows per-step progress with green checkmarks for completed steps and links to relevant settings pages for incomplete ones
- Onboarding status API checks three dimensions: Granola connection, personality profile completion, and contacts existence
- Collapsible accordion instructions in both wizard GranolaStep and settings GranolaTokenForm with inline error display and retry
- localStorage-based dismiss prevents wizard from re-appearing on subsequent visits

## Task Commits

Each task was committed atomically:

1. **Task 1: Create onboarding status API, wizard steps, and enhanced Granola instructions** - `937358d` (feat)
2. **Task 2: Build OnboardingWizard modal and SetupChecklist sidebar component, wire into layout** - `c949c83` (feat)

## Files Created/Modified
- `src/lib/onboarding.ts` - OnboardingStatus type, OnboardingStep type, ONBOARDING_STEPS constant
- `src/app/api/onboarding/status/route.ts` - GET endpoint checking Granola, profile, contacts completion status
- `src/components/onboarding/wizard-steps.tsx` - WelcomeStep, GranolaStep, ProfileStep, ProcessStep components
- `src/components/onboarding/onboarding-wizard.tsx` - Multi-step Dialog wizard with filtered step progression
- `src/components/onboarding/setup-checklist.tsx` - Sidebar checklist with SidebarMenu items linking to settings pages
- `src/components/ui/collapsible.tsx` - Shadcn Collapsible component (Base UI)
- `src/components/settings/granola-token-form.tsx` - Refactored with Collapsible accordion and inline error with retry
- `src/app/(dashboard)/dashboard/page.tsx` - OnboardingWizard conditionally rendered based on status and localStorage
- `src/app/(dashboard)/layout.tsx` - SetupChecklist added to sidebar after Navigation group

## Decisions Made
- Adapted profile completion detection from plan's `company`/`role` fields to actual `personality_profile` field matching the real database schema and existing ProfileForm component
- Used separate useEffect for onboarding fetch (not blocking dashboard stats load) for non-blocking UX
- Wizard step counter excludes Welcome step from "Step X of Y" display for cleaner UX
- CollapsibleTrigger styled directly (not using asChild) since Base UI components use render prop pattern, not Radix asChild

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted profile detection to actual schema**
- **Found during:** Task 1 (onboarding status API)
- **Issue:** Plan specified checking `company` or `role` fields but actual user_settings schema uses `personality_profile`, `business_objectives`, `projects`
- **Fix:** Changed has_profile detection to check `personality_profile` (the required field) instead of non-existent `company`/`role`
- **Files modified:** src/app/api/onboarding/status/route.ts, src/components/onboarding/wizard-steps.tsx (ProfileStep uses personality_profile form)
- **Verification:** API queries correct columns, ProfileStep PUT matches existing /api/settings/profile schema
- **Committed in:** 937358d (Task 1 commit)

**2. [Rule 1 - Bug] Fixed CollapsibleTrigger composition for Base UI**
- **Found during:** Task 1 (wizard-steps.tsx)
- **Issue:** Initially used `asChild` prop on CollapsibleTrigger which is a Radix pattern; project uses Base UI with `render` prop
- **Fix:** Applied styles directly to CollapsibleTrigger element instead of using asChild with a wrapper Button
- **Files modified:** src/components/onboarding/wizard-steps.tsx
- **Verification:** Matches existing Base UI component patterns in codebase
- **Committed in:** 937358d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both auto-fixes necessary for correctness with actual schema and component library. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 05 (Onboarding & First Impressions) is complete with all 3 plans executed
- Full onboarding flow: wizard on first visit, sidebar checklist for ongoing progress, enhanced Granola instructions
- Ready for Phase 06 (Safety & Trust) which can build on the established UI patterns

## Self-Check: PASSED

- [x] src/lib/onboarding.ts exists
- [x] src/app/api/onboarding/status/route.ts exists
- [x] src/components/onboarding/wizard-steps.tsx exists
- [x] src/components/onboarding/onboarding-wizard.tsx exists
- [x] src/components/onboarding/setup-checklist.tsx exists
- [x] src/components/ui/collapsible.tsx exists
- [x] src/components/settings/granola-token-form.tsx exists
- [x] src/app/(dashboard)/dashboard/page.tsx exists
- [x] src/app/(dashboard)/layout.tsx exists
- [x] Commit 937358d found
- [x] Commit c949c83 found

---
*Phase: 05-onboarding-first-impressions*
*Completed: 2026-03-20*
