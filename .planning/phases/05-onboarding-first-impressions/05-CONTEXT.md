# Phase 5: Onboarding & First Impressions - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the new user experience from empty confusion to guided, polished onboarding. Includes: setup wizard, persistent checklist, unified empty states, dark mode toggle, and shaped skeleton loading states. Does NOT include new features — this is UX polish on existing functionality.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Wizard
- Multi-step modal overlay (not full-page route) — centered dialog that walks through steps without leaving dashboard
- Steps: Welcome → Connect Granola → Configure Profile → Process First Meetings
- Allow skip with "I'll do this later" — sidebar checklist reminds them
- Onboarding complete when first contact is created (concrete milestone)
- Detect new user by checking: no Granola token, no contacts, no profile filled

### Empty States
- Unified component: icon + heading + description + primary CTA button
- Contextual CTAs: contacts empty → "Process Your First Meetings", drafts empty → "Set Up Outreach Schedule"
- Replace inconsistent patterns (Loader2 icon for empty contacts, CheckCircle for dashboard, Mail for drafts)

### Dark Mode
- Default to system preference (follow OS), user can override via toggle
- Toggle placement: sidebar footer, always accessible
- next-themes ThemeProvider already installed (v0.4.6) — just needs wrapping and toggle component
- CSS vars for dark mode already fully defined in globals.css

### Loading States
- Shape-matched skeletons: card skeletons look like cards, list items look like rows
- Fix contact detail page (currently raw animate-pulse divs instead of Skeleton component)
- Ensure all async pages have shaped loading states

### Granola Instructions
- Collapsible accordion format: brief summary visible, detailed steps expandable
- Inline error with retry if token validation fails

### Claude's Discretion
- Exact wizard step content/copy
- Skeleton layout dimensions
- Empty state icon choices per page
- Checklist badge/indicator design

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

### Existing patterns to follow
- `src/components/settings/api-key-form.tsx` — Card-based form pattern with loading/connected states
- `src/components/settings/granola-token-form.tsx` — Current Granola form to enhance
- `src/app/(dashboard)/dashboard/page.tsx` — Dashboard page to add wizard detection
- `src/app/(dashboard)/layout.tsx` — Layout for sidebar checklist and theme toggle
- `src/app/layout.tsx` — Root layout for ThemeProvider wrapper

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- shadcn/ui Skeleton component already installed and used in dashboard/contacts
- next-themes v0.4.6 installed, useTheme() used in sonner.tsx but no ThemeProvider wrapping app
- shadcn/ui Dialog component for wizard modal
- Sidebar component with SidebarFooter for toggle placement
- Toast (sonner) for success/error feedback

### Established Patterns
- "use client" for interactive components
- Card + CardHeader + CardContent for settings sections
- Badge for status indicators
- Fetch-based data loading with useEffect + useState

### Integration Points
- `src/app/layout.tsx` — needs ThemeProvider wrapper
- `src/app/(dashboard)/layout.tsx` — sidebar footer for toggle, sidebar content for checklist
- `src/app/(dashboard)/dashboard/page.tsx` — wizard detection on mount
- All pages with empty states: contacts, drafts, dashboard widgets

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following shadcn/ui patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-onboarding-first-impressions*
*Context gathered: 2026-03-20 via smart discuss*
