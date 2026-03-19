# Phase 2: Data Pipeline + Contacts - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the data pipeline from Granola meeting transcripts to structured contact cards, plus the contact management UI. Users see rich contact cards automatically created and updated from meetings, with full relationship context. Includes scheduled + manual processing via Trigger.dev, AI extraction via z.ai GLM5, contact deduplication, and the contacts dashboard with editing, categories, and outreach frequency settings.

</domain>

<decisions>
## Implementation Decisions

### Seed Data Strategy
- Pre-scraped enriched contact data exists at `relationships/` directory (32 MD files across 8 categories)
- Categories already defined: accelerators, advisors, clients, investors, networking, partners, potential-team, team
- Each MD file follows a consistent structure: Contact Info, Background, Relationship Context (Why, What, Mutual Value), Meeting History (with Granola URLs), Action Items, Notes
- **Phase 2 must import these seed files into Supabase** as the initial contact base — they represent real relationship data that kick-starts the product
- The ongoing Granola pipeline should produce contacts in the same structure as these seed files

### Contact Data Model
- Contact card fields match seed MD structure: name, email, company, role, location, connected_via, category, background, relationship_context (why, what, mutual_value), status
- Meeting history is a separate linked table (contact_id → meetings), each with date, title, summary, granola_url
- Action items are a separate linked table (contact_id → action_items), each with text, completed flag, source_meeting_id
- Notes stored as text field on the contact record
- Outreach frequency stored as integer (days between touchpoints) on the contact record

### Granola Integration
- Granola MCP server is available for interactive use but CANNOT run server-side in Trigger.dev background jobs
- For scheduled processing: capture Granola bearer token during interactive session, store encrypted in Supabase, use it to call Granola's HTTP API directly from Trigger.dev tasks
- Manual trigger: API route that invokes the same Trigger.dev task on-demand
- Processing schedule comes from `user_settings.processing_schedule` JSONB (already built in Phase 1)

### AI Extraction
- z.ai GLM5 at `api.z.ai/api/paas/v4/` — OpenAI-compatible API
- User provides their own API key (stored encrypted in `user_settings.zai_api_key_encrypted` from Phase 1)
- AI extracts structured contact data from meeting transcripts using structured output / function calling
- Deduplication by email address — if email matches existing contact, update rather than create
- Low-confidence extractions should be flagged for user review (don't auto-create if name/email uncertain)

### Contact Card UI
- Card-based layout using existing shadcn/ui Card component
- Contact list page at `/contacts` — grid/list of contact cards with search + category filter
- Contact detail page at `/contacts/[id]` — full card with all fields, meeting history, action items
- User can edit any field inline on the detail page
- User can assign/change category via dropdown
- User can set outreach frequency (days) per contact
- Each meeting in history links to Granola URL

### Claude's Discretion
- Exact Trigger.dev task structure (fan-out pattern, concurrency limits)
- AI prompt engineering for contact extraction from transcripts
- Contact card visual design details (spacing, typography within cards)
- Search implementation (client-side filter vs server-side query)
- Loading/empty state designs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Seed data (contact structure reference)
- `relationships/advisors/2026-02-03-dave-brown.md` — Reference contact MD showing full structure: Contact Info, Background, Relationship Context, Meeting History with Granola URLs, Action Items, Notes
- `relationships/networking/` — 12 contact files showing networking category pattern
- `relationships/partners/` — 19 contact files showing partner category pattern

### Phase 1 infrastructure (already built)
- `src/lib/supabase/server.ts` — Server-side Supabase client (for API routes)
- `src/lib/supabase/admin.ts` — Admin client (for Trigger.dev tasks bypassing RLS)
- `src/lib/crypto/encryption.ts` — AES-256-GCM encrypt/decrypt (for API keys, tokens)
- `src/lib/validations/settings.ts` — Zod schemas pattern (replicate for contacts)
- `src/middleware.ts` — Auth middleware pattern (getUser + redirect)
- `supabase/migrations/00001_create_user_settings.sql` — RLS migration pattern to replicate
- `trigger.config.ts` — Trigger.dev configuration
- `src/trigger/example.ts` — Trigger.dev task scaffold

### Research (from project research phase)
- `.planning/research/ARCHITECTURE.md` — System architecture, data flow patterns, multi-tenancy
- `.planning/research/PITFALLS.md` — Granola MCP limitations, contact deduplication risks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/server.ts` + `admin.ts`: Server and admin Supabase clients for API routes and Trigger.dev tasks
- `src/lib/crypto/encryption.ts`: AES-256-GCM for encrypting Granola bearer tokens
- `src/lib/validations/settings.ts`: Zod schema pattern — replicate for contact schemas
- `src/components/ui/*`: shadcn/ui components (Card, Button, Input, Badge, etc.)
- `src/components/settings/*`: Form pattern with React Hook Form + Zod + toast feedback
- `trigger.config.ts`: Trigger.dev already configured with project ref

### Established Patterns
- API routes: GET/PUT with `createClient()` from server.ts, `getUser()` for auth, Zod parse, RLS-scoped queries
- Forms: React Hook Form + Zod resolver, fetch to API routes, toast on success/error
- Migrations: `ENABLE ROW LEVEL SECURITY` + 4 CRUD policies + `(select auth.uid())` wrapper
- Encryption: `encrypt(plaintext)` / `decrypt(ciphertext)` for sensitive data

### Integration Points
- Dashboard layout at `src/app/(dashboard)/layout.tsx` — new `/contacts` route lives here
- Settings navigation — contacts link in main nav
- Trigger.dev tasks at `src/trigger/` — new processing tasks go here
- Supabase migrations at `supabase/migrations/` — new contact/meeting tables

</code_context>

<specifics>
## Specific Ideas

- Seed data at `relationships/` must be importable — write a migration script or Trigger.dev task that parses all MD files and inserts into Supabase
- Contact categories should match the existing directory structure: accelerators, advisors, clients, investors, networking, partners, potential-team, team
- Meeting history entries should preserve the Granola note URLs (format: `https://app.granola.so/notes/{id}`)
- Action items from seed data have checkbox format `- [ ] task text` — parse and import as individual records

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-data-pipeline-contacts*
*Context gathered: 2026-03-19*
