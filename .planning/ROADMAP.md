# Roadmap: ELITE Relationship Intelligence Agent

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-03-19)
- 🚧 **v1.1 Production-Grade UX/UI** - Phases 5-8 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-19</summary>

- [x] Phase 1: Foundation + Auth (3/3 plans) - completed 2026-03-18
- [x] Phase 2: Data Pipeline + Contacts (5/5 plans) - completed 2026-03-19
- [x] Phase 3: Outreach Engine (3/3 plans) - completed 2026-03-19
- [x] Phase 4: Dashboard Intelligence (2/2 plans) - completed 2026-03-19

</details>

### v1.1 Production-Grade UX/UI (In Progress)

**Milestone Goal:** Take the app from functional prototype to production-ready quality -- every user interaction should feel polished, guided, and resilient.

- [ ] **Phase 5: Onboarding & First Impressions** - New users get a guided setup experience with polished loading and theming
- [ ] **Phase 6: Safety & Resilience** - Errors are caught gracefully, destructive actions require confirmation, forms validate inline
- [ ] **Phase 7: Navigation & Information Architecture** - Dashboard has proper header, breadcrumbs, pagination, and visual hierarchy
- [ ] **Phase 8: Mobile & Accessibility** - App is usable on mobile and navigable by keyboard/screen reader

## Phase Details

### Phase 5: Onboarding & First Impressions
**Goal**: New users encounter a guided, welcoming experience that walks them through setup and shows polished loading and theming across the app
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06
**Success Criteria** (what must be TRUE):
  1. A brand-new user who logs in for the first time sees a setup wizard that detects missing Granola connection, missing contacts, and missing profile -- and guides them through each step
  2. A persistent setup checklist appears in the sidebar and tracks completion of all onboarding steps until every step is done
  3. Every page that can be empty (contacts, drafts, analytics) shows a unified empty state with icon, title, description, and a CTA button that leads somewhere useful
  4. All async-loading pages show shaped skeleton placeholders instead of raw animate-pulse divs or blank screens
  5. User can toggle between light and dark mode from the sidebar, and the choice persists across sessions
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Safety & Resilience
**Goal**: Users never see a white screen crash, destructive actions always require confirmation, and form errors are clear and immediate
**Depends on**: Phase 5
**Requirements**: SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05, SAFE-06
**Success Criteria** (what must be TRUE):
  1. If a dashboard widget, contact detail section, or draft list throws a runtime error, a friendly error boundary message appears instead of a white screen -- and the rest of the page remains functional
  2. Navigating to a nonexistent dashboard route or a missing resource shows a styled error/not-found page with a link back to the dashboard
  3. Dismissing a draft or sending a draft always shows an AlertDialog confirmation that the user must explicitly accept before the action proceeds
  4. All forms (settings, profile, contact edit) show inline validation errors next to the offending field on submit, and focus moves to the first error
  5. Status colors, risk indicator borders, and sync status styles are driven by a single shared constants file so visual changes propagate everywhere
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Navigation & Information Architecture
**Goal**: Users can orient themselves at any depth in the app, find contacts efficiently at scale, and experience consistent visual hierarchy
**Depends on**: Phase 5, Phase 6
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06
**Success Criteria** (what must be TRUE):
  1. Every dashboard page has a top header bar containing the sidebar trigger, dynamic breadcrumbs showing the current location, and the theme toggle
  2. Breadcrumbs update dynamically as the user navigates (e.g. "Contacts > Jane Smith", "Settings > Integrations") and each segment is a clickable link
  3. The contact list paginates at 24 contacts per page with working previous/next controls and a page indicator
  4. While a search query is debouncing or fetching, a spinner appears inside the search input to indicate loading
  5. Draft sync status dots show an explanatory tooltip on hover describing what each status means
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Mobile & Accessibility
**Goal**: The app is fully usable on mobile screens and navigable by keyboard and screen reader users
**Depends on**: Phase 5, Phase 6, Phase 7
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06
**Success Criteria** (what must be TRUE):
  1. On mobile viewports, the sidebar collapses behind a hamburger menu that opens and closes correctly
  2. Every interactive element (buttons, links, inputs, toggles) shows a visible focus ring when navigated to via keyboard
  3. Screen readers announce status dots, risk indicators, form fields, and navigation landmarks with descriptive ARIA labels
  4. A keyboard user can press a skip-to-content link to bypass navigation and jump directly to the main content area
  5. On mobile, contact cards stack vertically, forms render in a single column, and no buttons are truncated or overlapping
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 5.x -> 6 -> 6.x -> 7 -> 7.x -> 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Auth | v1.0 | 3/3 | Complete | 2026-03-18 |
| 2. Data Pipeline + Contacts | v1.0 | 5/5 | Complete | 2026-03-19 |
| 3. Outreach Engine | v1.0 | 3/3 | Complete | 2026-03-19 |
| 4. Dashboard Intelligence | v1.0 | 2/2 | Complete | 2026-03-19 |
| 5. Onboarding & First Impressions | v1.1 | 0/? | Not started | - |
| 6. Safety & Resilience | v1.1 | 0/? | Not started | - |
| 7. Navigation & Information Architecture | v1.1 | 0/? | Not started | - |
| 8. Mobile & Accessibility | v1.1 | 0/? | Not started | - |

---
*Full v1.0 details: .planning/milestones/v1.0-ROADMAP.md*
