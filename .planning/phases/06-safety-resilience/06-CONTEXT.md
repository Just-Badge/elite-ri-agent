# Phase 6: Safety & Resilience - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add error boundaries, confirmation dialogs for destructive actions, inline form validation, and centralize duplicated status constants. Pure resilience/safety work — no new features.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Follow existing shadcn/ui patterns and the approved plan requirements (SAFE-01 through SAFE-06).

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in REQUIREMENTS.md (SAFE-01 through SAFE-06).

</canonical_refs>

<code_context>
## Existing Code Insights

### Key Files
- `src/components/contacts/contact-detail.tsx` — has Dialog for delete, needs AlertDialog migration
- `src/app/(dashboard)/drafts/page.tsx` — dismiss/send fire immediately, need confirmation
- `src/components/contacts/contact-card.tsx` — has STATUS_COLORS duplicate
- `src/components/contacts/contact-detail.tsx` — has STATUS_COLORS duplicate
- `src/components/drafts/draft-card.tsx` — has SYNC_STATUS_STYLES

### Patterns
- shadcn/ui Dialog already used for contact delete
- Install alert-dialog: `npx shadcn@latest add alert-dialog`
- react-hook-form + zod validation already in contact-form, draft-editor

</code_context>

<specifics>
## Specific Ideas

No specific requirements — follow standard patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-safety-resilience*
*Context gathered: 2026-03-20 via infrastructure skip*
