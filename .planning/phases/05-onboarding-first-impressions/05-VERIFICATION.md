---
phase: 05-onboarding-first-impressions
verified: 2026-03-20T21:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Log in as a brand-new user (no Granola, no contacts, no profile) and navigate to /dashboard"
    expected: "OnboardingWizard modal appears immediately without refreshing the page"
    why_human: "localStorage-gated condition and fetch timing cannot be verified programmatically; requires a real browser session with a clean user account"
  - test: "Click 'I'll set up later' in the wizard, then refresh the page"
    expected: "Wizard does NOT reappear; sidebar shows the Setup Progress checklist with all three steps incomplete"
    why_human: "localStorage persistence across reload requires a real browser session"
  - test: "Complete all three onboarding steps (Granola, Profile, Process Meetings) via the sidebar checklist links"
    expected: "Setup Progress checklist disappears from the sidebar once all steps are marked complete"
    why_human: "Checklist auto-hide depends on /api/onboarding/status returning is_complete=true with real data, which requires real backend state"
  - test: "Toggle the theme from the sidebar footer (System -> Light -> Dark -> System)"
    expected: "All UI elements — cards, sidebar, inputs, badges, toasts — render correctly in both light and dark mode with no unstyled or broken elements"
    why_human: "Visual correctness of dark mode CSS variables across all components cannot be verified by grep; requires visual inspection"
  - test: "Navigate to /contacts and /drafts with an empty account"
    expected: "Contacts page shows 'No contacts yet' with a 'Process Meetings' CTA button; Drafts page shows 'No drafts to review' with a 'Set Up Outreach Schedule' CTA button"
    why_human: "CTA button rendering and navigation behavior require a real browser to confirm href routing works"
---

# Phase 5: Onboarding & First Impressions Verification Report

**Phase Goal:** New users encounter a guided, welcoming experience that walks them through setup and shows polished loading and theming across the app
**Verified:** 2026-03-20T21:00:00Z
**Status:** human_needed (all automated checks passed — 5 items need human testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A brand-new user who logs in for the first time sees a setup wizard that detects missing Granola connection, missing contacts, and missing profile — and guides them through each step | VERIFIED | `OnboardingWizard` rendered at line 147-152 of `dashboard/page.tsx` behind `showWizard && onboardingStatus` guard; wizard fetches `/api/onboarding/status` which queries `granola_refresh_token_encrypted`, `personality_profile`, and contacts count; all 4 step components (Welcome, Granola, Profile, Process) are substantive with real API calls |
| 2 | A persistent setup checklist appears in the sidebar and tracks completion of all onboarding steps until every step is done | VERIFIED | `SetupChecklist` imported and rendered in `(dashboard)/layout.tsx` line 56; fetches `/api/onboarding/status` on mount; renders `SidebarGroup` with per-step `CheckCircle2`/`Circle` indicators; returns `null` when `status.is_complete` is true |
| 3 | Every page that can be empty shows a unified empty state with icon, title, description, and a CTA button that leads somewhere useful | VERIFIED | `EmptyState` component confirmed in 6 locations: contacts/page.tsx (2 branches), drafts/draft-list.tsx (with "Set Up Outreach Schedule" CTA), risk-contacts.tsx, triage-contacts.tsx, pending-actions.tsx, outreach-analytics.tsx; component exports `icon`, `heading`, `description`, optional `action` CTA |
| 4 | All async-loading pages show shaped skeleton placeholders instead of raw animate-pulse divs or blank screens | VERIFIED | contact-detail.tsx: no `animate-pulse` found, uses 6 `Skeleton` components shape-matched to actual layout; dashboard/page.tsx: `h-[106px]` stat card skeletons and `h-[300px]` widget skeletons; `grep -rn animate-pulse src/components/contacts/` returns empty |
| 5 | User can toggle between light and dark mode from the sidebar, and the choice persists across sessions | VERIFIED | `ThemeProvider` in root layout with `attribute="class"` `defaultTheme="system"` `enableSystem`; `suppressHydrationWarning` on `<html>`; `ThemeToggle` in `SidebarFooter` of dashboard layout; uses `localStorage`-backed `next-themes` for persistence |

**Score:** 5/5 truths verified (automated evidence found for all)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/layout.tsx` | ThemeProvider wrapping entire app | VERIFIED | ThemeProvider wraps body at line 33; `suppressHydrationWarning` on `<html>` at line 29 |
| `src/components/theme-toggle.tsx` | Theme toggle button component | VERIFIED | 53 lines; "use client"; `useTheme` hook; 3-way cycling; mounted state guard; `aria-label="Toggle theme"` |
| `src/app/(dashboard)/layout.tsx` | Theme toggle in SidebarFooter + SetupChecklist in SidebarContent | VERIFIED | `SidebarFooter` with `ThemeToggle` at line 58-62; `SetupChecklist` rendered at line 56 |
| `src/components/ui/empty-state.tsx` | Unified EmptyState component | VERIFIED | Exports `EmptyState` and `EmptyStateProps`; icon, heading, description, optional action CTA, compact mode |
| `src/components/contacts/contact-detail.tsx` | Skeleton loading replacing animate-pulse | VERIFIED | `import { Skeleton }` at line 29; 6 Skeleton usages; zero `animate-pulse` occurrences |
| `src/lib/onboarding.ts` | OnboardingStatus types and ONBOARDING_STEPS | VERIFIED | Exports `OnboardingStatus` interface, `OnboardingStep` type, `ONBOARDING_STEPS` array with 3 entries |
| `src/app/api/onboarding/status/route.ts` | GET endpoint returning completion status | VERIFIED | Authenticated GET; queries `user_settings` for `granola_refresh_token_encrypted` + `personality_profile`; counts contacts; returns `{ data: OnboardingStatus }` |
| `src/components/onboarding/onboarding-wizard.tsx` | Multi-step modal wizard | VERIFIED | "use client"; `Dialog` component; 4 step components rendered conditionally; `useMemo` filters already-completed steps; `handleSkip` and `handleNext` callbacks; localStorage dismiss via `onComplete` |
| `src/components/onboarding/setup-checklist.tsx` | Sidebar checklist tracking progress | VERIFIED | "use client"; fetches `/api/onboarding/status`; renders `ONBOARDING_STEPS` with `CheckCircle2`/`Circle` per completion; links incomplete steps to relevant pages; returns `null` when complete |
| `src/components/onboarding/wizard-steps.tsx` | 4 wizard step components | VERIFIED | Exports `WelcomeStep`, `GranolaStep`, `ProfileStep`, `ProcessStep`; each has real API calls (`/api/granola/token`, `/api/settings/profile`, `/api/meetings/process`); inline error + Retry button; skip links |
| `src/components/settings/granola-token-form.tsx` | Collapsible instructions with inline error + retry | VERIFIED | Imports `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`; `ChevronDown` rotation on open; inline `setError` state; Retry button at line 189 |
| `src/components/ui/collapsible.tsx` | Shadcn Collapsible component | VERIFIED | File exists; used in wizard-steps.tsx and granola-token-form.tsx |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/layout.tsx` | `next-themes` | `ThemeProvider` wrapper | WIRED | `import { ThemeProvider } from "next-themes"` at line 3; wraps entire app body |
| `src/components/theme-toggle.tsx` | `next-themes` | `useTheme` hook | WIRED | `import { useTheme } from "next-themes"` at line 4; `theme`, `resolvedTheme`, `setTheme` destructured |
| `src/app/(dashboard)/layout.tsx` | `src/components/theme-toggle.tsx` | `SidebarFooter` import | WIRED | `import { ThemeToggle }` at line 17; `<ThemeToggle />` inside `SidebarFooter` |
| `src/app/(dashboard)/layout.tsx` | `src/components/onboarding/setup-checklist.tsx` | `SetupChecklist` in `SidebarContent` | WIRED | `import { SetupChecklist }` at line 18; `<SetupChecklist />` at line 56 inside `SidebarContent` |
| `src/app/(dashboard)/contacts/page.tsx` | `src/components/ui/empty-state.tsx` | `EmptyState` import | WIRED | `import { EmptyState }` at line 17; used in 2 conditional branches at lines 158 and 164 |
| `src/components/drafts/draft-list.tsx` | `src/components/ui/empty-state.tsx` | `EmptyState` import | WIRED | `import { EmptyState }` at line 6; used at line 29 with CTA action |
| `src/components/dashboard/risk-contacts.tsx` | `src/components/ui/empty-state.tsx` | `EmptyState` import | WIRED | `import { EmptyState }` at line 7; `<EmptyState compact` at line 35 |
| `src/app/(dashboard)/dashboard/page.tsx` | `src/components/onboarding/onboarding-wizard.tsx` | `OnboardingWizard` rendered conditionally | WIRED | `import { OnboardingWizard }` at line 10; rendered at line 147-152 behind `showWizard && onboardingStatus` |
| `src/components/onboarding/onboarding-wizard.tsx` | `src/app/api/onboarding/status/route.ts` | `fetch /api/onboarding/status` | WIRED | Fetch in `dashboard/page.tsx` at line 86 provides status; wizard receives `onboardingStatus` as prop |
| `src/components/onboarding/setup-checklist.tsx` | `src/app/api/onboarding/status/route.ts` | `fetch /api/onboarding/status` | WIRED | `fetch("/api/onboarding/status")` in useEffect at line 45 |
| `src/components/onboarding/wizard-steps.tsx` | `src/components/settings/granola-token-form.tsx` | Collapsible pattern in GranolaStep | PARTIAL-ACCEPTABLE | GranolaStep implements its own inline Granola form (not importing GranolaTokenForm); plan allowed embedding a "simplified version" — both use the same Collapsible pattern. Not a gap. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ONBD-01 | 05-03-PLAN.md | New user sees guided onboarding wizard on first login | SATISFIED | OnboardingWizard in dashboard/page.tsx; detects `has_granola`, `has_contacts`, `has_profile` from API |
| ONBD-02 | 05-03-PLAN.md | Setup checklist persists in sidebar until all steps complete | SATISFIED | SetupChecklist in dashboard/layout.tsx; returns null when `is_complete=true` |
| ONBD-03 | 05-03-PLAN.md | Granola instructions improved with collapsible step-by-step guidance | SATISFIED | `Collapsible` in both granola-token-form.tsx and GranolaStep in wizard-steps.tsx; ChevronDown rotation; inline error + Retry |
| ONBD-04 | 05-02-PLAN.md | Unified empty state across all pages (icon + title + description + CTA) | SATISFIED | EmptyState used in 6 locations; all have icon + heading + description; contacts and drafts have CTA actions |
| ONBD-05 | 05-01-PLAN.md | Dark mode toggle in sidebar using next-themes ThemeProvider | SATISFIED | ThemeProvider in root layout; ThemeToggle in SidebarFooter; `defaultTheme="system"` |
| ONBD-06 | 05-02-PLAN.md | All async pages use shaped Skeleton loading (fix contact detail animate-pulse) | SATISFIED | contact-detail.tsx: zero animate-pulse; 6 Skeleton components shape-matched to layout; dashboard: h-[106px] + h-[300px] |

No orphaned requirements found. All 6 ONBD requirement IDs declared across 3 plans are accounted for.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/settings/granola-token-form.tsx` | 91 | Raw `animate-pulse` div in card loading state | INFO | Not in scope for ONBD-06 (which targeted contact-detail only); other settings forms have the same pattern; consistent with existing codebase |

No blocker or warning-level anti-patterns found. The one animate-pulse instance in granola-token-form.tsx is a pre-existing pattern shared by profile-form.tsx, api-key-form.tsx, and schedule-form.tsx — not introduced in this phase and not targeted by any requirement.

---

### Human Verification Required

All 5 items below require a real browser session to verify. Automated checks passed for all corresponding code paths.

#### 1. First-time user wizard appearance

**Test:** Log in with a fresh user account (no Granola token, no contacts, no personality_profile set). Navigate to /dashboard.
**Expected:** The OnboardingWizard Dialog modal opens automatically. The "Welcome to ELITE" step appears first. The step counter ("Step 1 of 3") should appear when advancing past Welcome.
**Why human:** The `showWizard` condition requires `!data.is_complete && !localStorage.getItem("elite_onboarding_dismissed")`. This can only be confirmed with real browser state and a real user account returning the right API response.

#### 2. Wizard dismiss persists across reload

**Test:** From the wizard, click "I'll set up later". Refresh the page.
**Expected:** The wizard does NOT reappear. The Setup Progress checklist is visible in the sidebar with all three steps shown as incomplete (Circle icons, not CheckCircle2).
**Why human:** localStorage persistence across page reload requires a real browser. The checklist's fetch is separate from the wizard dismiss logic.

#### 3. Setup checklist disappears on completion

**Test:** Complete all three onboarding steps (connect Granola, fill in Communication Style in profile, process meetings to get at least 1 contact). Return to /dashboard.
**Expected:** The Setup Progress sidebar group is gone (SetupChecklist returned null because `is_complete=true`).
**Why human:** Requires real data in all three backend dimensions (granola_refresh_token_encrypted, personality_profile, contacts count > 0).

#### 4. Dark mode visual correctness

**Test:** Click the theme toggle in the sidebar footer to cycle through System, Light, and Dark modes on several pages (Dashboard, Contacts, Contact Detail, Drafts, Settings).
**Expected:** All UI elements render correctly in dark mode — no white backgrounds on cards, no invisible text, no broken badge or button styles. Light mode is equally clean. The Monitor/Sun/Moon icons change correctly.
**Why human:** Visual correctness of 100+ CSS variables across all components cannot be verified by code inspection alone.

#### 5. Empty state CTA buttons navigate correctly

**Test:** With an empty account, visit /contacts and /drafts. Click the CTA buttons.
**Expected:** "Process Meetings" in contacts navigates to /settings/integrations. "Set Up Outreach Schedule" in drafts navigates to /settings/schedule. Pages load successfully.
**Why human:** href routing requires a running app to confirm Next.js Link navigation works end-to-end.

---

### Gaps Summary

No gaps found. All automated checks passed. The phase goal is substantively achieved in code — the 5 items flagged as human_needed are validation of runtime behavior, not evidence of missing implementation.

---

_Verified: 2026-03-20T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
