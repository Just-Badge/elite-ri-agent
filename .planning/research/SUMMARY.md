# Project Research Summary

**Project:** ELITE Relationship Intelligence Agent
**Domain:** Multi-tenant AI-powered personal CRM with automated outreach
**Researched:** 2026-03-18
**Confidence:** HIGH

## Executive Summary

ELITE is a relationship intelligence platform that automates the full lifecycle of professional relationship management: meetings are captured from Granola, AI extracts structured contact cards, relationship health is monitored against user-defined cadences, and personalized outreach emails are drafted by z.ai GLM-5 for human review before syncing to Gmail. No competitor combines meeting transcript processing with contextual AI outreach drafting -- Clay and Dex handle contact management but stop at reminders, Cloze does basic AI emails without deep meeting context. The human-in-the-loop draft review workflow is unique among personal CRMs and is the correct design for relationship-sensitive communications.

The recommended stack is Next.js 15.5 + Supabase Cloud + Trigger.dev v4 + shadcn/ui, deployed on Coolify. This is deliberately conservative: Next.js 15.5 over 16 (ecosystem still adapting), Recharts over Nivo, Zustand over Redux, @googleapis/gmail over full googleapis. Stability in the framework layer lets complexity live where it belongs -- in the Granola/Gmail/z.ai business logic. The architecture follows a Capture-Enrich-Analyze-Activate lifecycle with Trigger.dev dispatcher pattern fanning out to per-user tasks, Supabase RLS for multi-tenant isolation, and adapter interfaces isolating all external service dependencies.

Three risks dominate and must drive phase ordering: (1) Gmail's `gmail.compose` scope is "restricted" by Google, requiring a security assessment that takes 4-8 weeks -- verification must start in Phase 1 or it blocks production launch. (2) Granola's MCP server uses browser-based OAuth and cannot run in server-side background jobs; the architecture must use Granola's REST API or a token-bridging approach, requiring a Phase 1 spike. (3) AI-drafted emails that sound generic will cause users to abandon the core feature -- the prompt pipeline must layer user personality, meeting-specific context, relationship history, and action items to produce emails worth sending.

## Key Findings

### Recommended Stack

The stack centers on Next.js 15.5 (React 19), Supabase Cloud for auth + database + RLS, and Trigger.dev v4 for background processing. AI uses the OpenAI npm package pointed at z.ai's OpenAI-compatible endpoint with per-user API keys stored encrypted. Full details in `.planning/research/STACK.md`.

**Core technologies:**
- **Next.js 15.5 + React 19**: SSR, Server Components, API routes. Upgrade to 16 post-v1.
- **Supabase Cloud**: Google OAuth provider, PostgreSQL with RLS, encrypted credential storage.
- **Trigger.dev v4**: Cron scheduling, per-user task fan-out, queue-based concurrency isolation.
- **shadcn/ui v4 + Tailwind CSS 4.2**: Copied-in components (no dependency risk). DataTable, Card, Sheet, Form, Sidebar cover CRM dashboard needs.
- **OpenAI npm -> z.ai GLM-5**: OpenAI-compatible client, custom baseURL. Per-user API keys.
- **@googleapis/gmail**: Lightweight Gmail client (670KB vs 22MB). Draft creation and send.
- **Zod + React Hook Form**: Unified validation across forms, API routes, Trigger.dev schemaTask.
- **Zustand + nuqs**: Minimal client state (draft queues, UI) + URL state (shareable filtered views).

### Expected Features

Full prioritization matrix and competitor analysis in `.planning/research/FEATURES.md`.

**Must have (table stakes):**
- Contact cards with structured fields, auto-populated from Granola transcripts
- Contact search, filtering, and categorization/tagging
- Per-contact outreach cadence with follow-up reminders
- Dashboard overview: at-risk contacts, pending drafts, recent meetings
- Google OAuth login (SSO + Gmail API access in single flow)
- Gmail draft creation (dual-write: dashboard + Gmail)
- Settings panel: API keys, processing schedule, user profile
- Multi-tenant data isolation (Supabase RLS)

**Should have (differentiators -- these ARE the product):**
- Automatic contact extraction from meeting transcripts (zero manual entry)
- AI-drafted personalized outreach with meeting context + user personality
- Human-in-the-loop draft review (approve / edit+approve / dismiss)
- Meeting-sourced relationship context on contact cards
- Relationship health indicators (green/yellow/red based on cadence)
- User personality/tone profile for AI drafting
- Configurable processing schedule (Trigger.dev cron with timezone)

**Defer (v2+):**
- Multi-channel outreach (SMS, Slack, LinkedIn)
- Smart deduplication engine (fuzzy matching, merge workflows)
- Team/shared workspaces
- Mobile PWA
- Contact enrichment from external sources
- Outreach templates and bulk campaigns

### Architecture Approach

Four-layer lifecycle (Capture -> Enrich -> Analyze -> Activate) with four infrastructure components: Next.js dashboard (Coolify), Supabase Cloud (managed), Trigger.dev workers (Coolify or Cloud), and external APIs (Gmail, z.ai, Granola). Multi-tenancy uses shared tables with RLS. Background processing uses dispatcher-fan-out pattern. External services wrapped in adapter interfaces. Full schema, data flows, and deployment topology in `.planning/research/ARCHITECTURE.md`.

**Major components:**
1. **Next.js Dashboard** -- UI, API routes, auth flow, draft review workflow. Coolify container.
2. **Supabase Cloud** -- Auth, PostgreSQL (contacts, meetings, drafts, settings, oauth_tokens), RLS enforcement.
3. **Trigger.dev Workers** -- Meeting processing dispatcher, per-user contact extraction, outreach draft generation, Gmail sync. Per-user queues with concurrency limits.
4. **Adapter Layer** -- Pluggable interfaces: MeetingSource (Granola), AIProvider (z.ai), EmailProvider (Gmail).

### Critical Pitfalls

Complete pitfall analysis with recovery strategies in `.planning/research/PITFALLS.md`.

1. **Gmail restricted scope verification blocks launch** -- `gmail.compose` requires Google security assessment (4-8 weeks). Start verification in Phase 1. Alternative: `gmail.send` (sensitive, not restricted) if direct sending replaces draft creation.

2. **Granola MCP cannot run server-side** -- Browser-based OAuth, no headless auth path. Store bearer token from interactive OAuth, call REST API directly from Trigger.dev. Build source-agnostic transcript pipeline with manual upload fallback.

3. **Refresh token revocation breaks scheduled jobs silently** -- Google revokes on password reset, 6-month inactivity, testing mode (7-day). Token health check before every job; pause user processing + in-app notification on failure.

4. **RLS misconfiguration leaks multi-tenant data** -- New Supabase tables default to RLS disabled. Every migration must enable RLS + policies. CI check for unprotected tables. Never test via SQL Editor.

5. **Generic AI drafts kill the core feature** -- Layer prompts: user personality + contact meeting context + relationship history + action items. Track approval/edit/reject rates. Provide draft feedback mechanism.

## Implications for Roadmap

### Phase 1: Foundation + Auth + Infrastructure

**Rationale:** Every feature depends on auth and database. Gmail scope verification has the longest external lead time (4-8 weeks) and must start immediately. Granola data access strategy must be validated before pipeline work begins.
**Delivers:** Working Next.js app on Coolify, Supabase schema with RLS on all tables, Google OAuth login with provider token capture and encrypted storage, settings page with credential health checks, dashboard shell.
**Addresses features:** Google OAuth login, data privacy/isolation, settings panel, credential management.
**Avoids pitfalls:** Gmail restricted scope surprise (starts verification early), RLS misconfiguration (establishes migration templates), credential security gaps (AES-256 encryption from day one).
**Key spike:** Granola data access -- validate REST API access, determine whether MCP token bridging or direct API is viable for background jobs.

### Phase 2: Data Pipeline (Granola -> AI -> Contacts)

**Rationale:** The core value proposition is automatic contact creation from meetings. Depends on Phase 1 auth, database, and Granola spike results.
**Delivers:** Working meeting ingestion from Granola, AI contact card extraction via z.ai GLM-5, meeting storage with dedup, contact CRUD, Trigger.dev cron dispatcher with per-user fan-out, basic contact list view.
**Addresses features:** Granola transcript ingestion, automatic contact extraction, contact cards, meeting-sourced relationship context, scheduled processing.
**Avoids pitfalls:** Granola MCP limitation (uses REST API + adapter pattern), single-task-for-all-users (fan-out with per-user queues), dedup complexity (email-based exact match for v1, data model supports future fuzzy matching).

### Phase 3: Outreach Engine (Contacts -> AI Drafts -> Gmail)

**Rationale:** Requires contacts (Phase 2) and Gmail tokens (Phase 1). Builds the full activation loop: identify due contacts, draft personalized emails, sync to Gmail, present for human review.
**Delivers:** AI outreach drafting with layered context, draft review workflow (approve/edit/dismiss), Gmail draft sync, daily draft generation cron, outreach cadence tracking, user personality profile form.
**Addresses features:** AI-drafted outreach, draft review workflow, Gmail draft creation, per-contact cadence, relationship health indicators, user profile.
**Avoids pitfalls:** Generic drafts (layered prompt pipeline), token revocation (health checks before Gmail calls), auto-send (human-in-the-loop enforced).

### Phase 4: Intelligence + Polish

**Rationale:** Dashboard intelligence, search/filter, and Open Brain enhance the core loop but are not blockers. These features make the product delightful and sticky after the capture-to-outreach pipeline works.
**Delivers:** Contact search and filtering, relationship health dashboard with charts, Open Brain knowledge integration, interaction timeline, outreach analytics, processing status visibility, empty states and onboarding.
**Addresses features:** Dashboard overview, search/filtering, categorization/tagging, Open Brain integration, interaction timeline, analytics.
**Avoids pitfalls:** N+1 queries (optimized joins), context window overflow in AI (truncation strategy), blank pages for new users (empty states).

### Phase Ordering Rationale

- **Phase 1 first:** Auth and database are universal dependencies. Gmail verification has an external 4-8 week timeline that cannot be compressed. Credential encryption must exist before any API keys are stored.
- **Phase 2 before Phase 3:** Outreach drafting requires contacts with rich meeting context. The extraction pipeline must work before email generation is meaningful.
- **Phase 3 depends on Phases 1 + 2:** Gmail tokens from Phase 1 + contact data from Phase 2 are both prerequisites.
- **Phase 4 last:** Intelligence features enhance but do not enable the core loop. Can be built incrementally after the capture-to-outreach pipeline works end-to-end.
- **Granola spike in Phase 1:** The entire data pipeline depends on resolving how meeting data reaches the server. Blocking unknown must be resolved before Phase 2 begins.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1:** Granola data access spike -- must validate REST API vs MCP token bridging for server-side background ingestion. Highest-uncertainty integration.
- **Phase 2:** AI contact extraction prompt engineering -- quality of extracted data determines everything downstream. Needs iteration with real Granola transcripts.
- **Phase 3:** Gmail draft formatting (RFC 2822 MIME encoding), draft threading, restricted scope verification status check.

Phases with standard patterns (skip research-phase):
- **Phase 1 (auth/RLS):** Supabase Google OAuth + RLS is thoroughly documented with official guides.
- **Phase 4 (dashboard):** Standard Next.js + shadcn/ui + Recharts patterns. No novel integrations.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies mature, versions verified, compatibility confirmed. OpenAI client + z.ai tested pattern. |
| Features | HIGH | 6+ competitors analyzed (Clay, Dex, Folk, Cloze, Monica, Affinity). Clear market gap. Feature dependencies mapped. |
| Architecture | HIGH (core), MEDIUM (Granola) | RLS, fan-out, adapter patterns are standard. Granola integration has uncertainty around API access and auth in background jobs. |
| Pitfalls | HIGH | Gmail restricted scope, Supabase RLS defaults, Trigger.dev limitations all verified against official docs. Confirmed blockers if unaddressed. |

**Overall confidence:** HIGH

### Gaps to Address

- **Granola production access:** Unclear whether REST API requires Enterprise plan, actual rate limits, and whether MCP OAuth bearer tokens can be reused server-side. Phase 1 spike required.
- **z.ai GLM-5 context window:** STACK.md reports 205K, ARCHITECTURE.md says 80K input. Needs verification. Either is sufficient for transcripts but affects prompt design headroom.
- **Gmail scope strategy decision:** Use `gmail.compose` (restricted, 4-8 week verification, enables drafts) or `gmail.send` (sensitive, faster verification, direct sending only)? Must decide in Phase 1.
- **Open Brain schema:** Integration references existing Supabase Open Brain tables but schema is undocumented in research. Needs discovery during Phase 4 planning.
- **Google verification timeline:** 4-8 week estimate from community reports. Actual timeline depends on submission quality and Google's review backlog. Start early, track actively.
- **Granola token lifecycle:** Token expiry and refresh behavior undocumented. Determines whether automated ingestion is sustainable long-term.

## Sources

### Primary (HIGH confidence)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Auth flow, provider token handling
- [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- Server-side client patterns
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- Optimization, subselect caching
- [Gmail API Scope Classification](https://developers.google.com/workspace/gmail/api/auth/scopes) -- Restricted scope confirmation
- [Google OAuth Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) -- Security assessment requirements
- [z.ai GLM-5 Documentation](https://docs.z.ai/guides/llm/glm-5) -- API reference, OpenAI compatibility
- [Trigger.dev v4 GA](https://trigger.dev/changelog/trigger-v4-ga) -- v4 stability, v3 sunset July 2026
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- Programmatic MCP client
- [shadcn/ui Installation](https://ui.shadcn.com/docs/installation/next) -- Next.js integration
- [Coolify Next.js Deployment](https://coolify.io/docs/applications/nextjs) -- Container deployment

### Secondary (MEDIUM confidence)
- [Granola API Documentation](https://docs.granola.ai/introduction) -- REST API exists but Enterprise plan gating unclear
- [Granola MCP Documentation](https://docs.granola.ai/help-center/sharing/integrations/mcp) -- Browser OAuth limitation confirmed
- [Clay](https://clay.earth/), [Dex](https://getdex.com/), [Folk](https://www.folk.app/), [Cloze](https://ai.cloze.com/), [Monica](https://github.com/monicahq/monica), [Affinity](https://www.affinity.co/) -- Competitor feature analysis
- [Next.js 15 vs 16](https://www.descope.com/blog/post/nextjs15-vs-nextjs16) -- Breaking changes in 16

### Tertiary (LOW confidence)
- [Granola MCP Server (proofgeist)](https://github.com/proofgeist/granola-mcp-server) -- Community MCP, local cache approach
- [Coolify Trigger.dev Template](https://github.com/essamamdani/coolify-trigger-v4) -- Community self-hosting setup

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
