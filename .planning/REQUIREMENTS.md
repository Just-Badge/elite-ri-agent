# Requirements: ELITE RI Agent v1.1

**Defined:** 2026-03-20
**Core Value:** Take the app from functional prototype to production-ready quality — every user interaction should feel polished, guided, and resilient.

## v1.1 Requirements

### Onboarding & First Impressions

- [x] **ONBD-01**: New user sees guided onboarding wizard on first login (detects no Granola, no contacts, no profile)
- [x] **ONBD-02**: Setup checklist persists in sidebar until all steps complete
- [x] **ONBD-03**: Granola connection instructions improved with clearer step-by-step guidance
- [x] **ONBD-04**: Unified empty state component used across all pages (icon + title + description + CTA button)
- [x] **ONBD-05**: Dark mode toggle in sidebar using next-themes ThemeProvider
- [x] **ONBD-06**: All async pages use shaped Skeleton loading states (fix contact detail raw animate-pulse)

### Safety & Resilience

- [ ] **SAFE-01**: Error boundary component wraps major page sections (dashboard widgets, contact detail, draft list)
- [ ] **SAFE-02**: Next.js error.tsx and not-found.tsx pages for dashboard route group
- [ ] **SAFE-03**: AlertDialog confirmation on draft dismiss and draft send
- [ ] **SAFE-04**: Contact delete migrated from Dialog to AlertDialog (proper focus trap)
- [ ] **SAFE-05**: All form fields show inline validation errors on submit with focus-on-first-error
- [ ] **SAFE-06**: Status colors, risk borders, sync styles centralized into single constants file

### Navigation & Information Architecture

- [ ] **NAV-01**: Top header bar in dashboard layout with SidebarTrigger, breadcrumbs, theme toggle
- [ ] **NAV-02**: Dynamic breadcrumb component (Contacts > Contact Name, Settings > Integrations)
- [ ] **NAV-03**: Contact list pagination at 24 per page with shadcn Pagination component
- [ ] **NAV-04**: Search spinner inside input during debounce/fetch
- [ ] **NAV-05**: Tooltip explanations on draft sync status dots
- [ ] **NAV-06**: Typography hierarchy standardized across all pages

### Mobile & Accessibility

- [ ] **A11Y-01**: Sidebar hamburger works correctly on mobile
- [ ] **A11Y-02**: Visible focus rings on all interactive elements
- [ ] **A11Y-03**: ARIA labels on status dots, risk indicators, form fields, navigation landmarks
- [ ] **A11Y-04**: Skip-to-content link for keyboard users
- [ ] **A11Y-05**: aria-live regions for search results count and dashboard stats
- [ ] **A11Y-06**: Mobile layout verification — cards stack, forms single-column, buttons don't truncate

## v1.2 Requirements

### Multi-Account & Advanced Features

- **MULT-01**: User can add multiple Google/email sending accounts
- **MULT-02**: User can select which account to send from per draft
- **NOTF-01**: Real-time notifications for processing completion and draft status
- **IMEX-01**: Export contacts to CSV
- **BULK-01**: Multi-select contacts/drafts for bulk actions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple AI models | z.ai GLM5 only — expand in v1.2+ |
| Rich text draft editor | Plain textarea is functional for v1.1 |
| Mobile native app | Web-first, PWA possible in v1.2 |
| Real-time notifications | Deferred to v1.2 |
| Bulk actions | Deferred to v1.2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | Phase 5 | Complete |
| ONBD-02 | Phase 5 | Complete |
| ONBD-03 | Phase 5 | Complete |
| ONBD-04 | Phase 5 | Complete |
| ONBD-05 | Phase 5 | Complete |
| ONBD-06 | Phase 5 | Complete |
| SAFE-01 | Phase 6 | Pending |
| SAFE-02 | Phase 6 | Pending |
| SAFE-03 | Phase 6 | Pending |
| SAFE-04 | Phase 6 | Pending |
| SAFE-05 | Phase 6 | Pending |
| SAFE-06 | Phase 6 | Pending |
| NAV-01 | Phase 7 | Pending |
| NAV-02 | Phase 7 | Pending |
| NAV-03 | Phase 7 | Pending |
| NAV-04 | Phase 7 | Pending |
| NAV-05 | Phase 7 | Pending |
| NAV-06 | Phase 7 | Pending |
| A11Y-01 | Phase 8 | Pending |
| A11Y-02 | Phase 8 | Pending |
| A11Y-03 | Phase 8 | Pending |
| A11Y-04 | Phase 8 | Pending |
| A11Y-05 | Phase 8 | Pending |
| A11Y-06 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
