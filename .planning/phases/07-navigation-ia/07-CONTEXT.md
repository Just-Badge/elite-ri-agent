# Phase 7: Navigation & Information Architecture - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add header bar with breadcrumbs, contact pagination, search feedback, sync status tooltips, and typography consistency. Navigation and visual hierarchy improvements — no new features.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure/navigation phase. Follow existing shadcn/ui patterns and approved requirements (NAV-01 through NAV-06). Install breadcrumb and pagination shadcn components.

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements in REQUIREMENTS.md (NAV-01 through NAV-06).

</canonical_refs>

<code_context>
## Existing Code Insights

### Key Files
- `src/app/(dashboard)/layout.tsx` — needs header bar with SidebarTrigger + breadcrumbs + theme toggle (move from footer)
- `src/app/(dashboard)/contacts/page.tsx` — needs pagination + search spinner
- `src/app/api/contacts/route.ts` — needs page/limit query params
- `src/components/drafts/draft-card.tsx` — sync status dots need tooltips
- Install: `npx shadcn@latest add breadcrumb pagination`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard navigation patterns.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 07-navigation-ia*
*Context gathered: 2026-03-20 via infrastructure skip*
