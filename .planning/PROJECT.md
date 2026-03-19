# ELITE Relationship Intelligence Agent

## What This Is

A multi-tenant AI-powered relationship intelligence platform that automatically processes meeting transcripts from Granola, builds rich contact cards with full relationship context, and automates personalized outreach via Gmail. Users manage their network through a dashboard where they can review contacts, set outreach cadences, approve AI-drafted emails, and track relationship health — all powered by context from their meetings, knowledge base (Open Brain), and personal profile.

## Core Value

The agent must reliably turn raw meeting data into actionable relationship intelligence AND draft contextually-aware outreach emails — the full loop from "meeting happened" to "relationship maintained" without manual effort.

## Requirements

### Validated

- ✓ Multi-tenant auth via Google OAuth (doubles as Gmail authorization) — Phase 1
- ✓ Settings panel: user personality/tone/style form, schedule configuration, API key management — Phase 1
- ✓ User profile form for tone, style, personality, projects, business objectives — Phase 1
- ✓ Configurable meeting processing schedule (e.g., every 2 hours, 8am-6pm PDT) — Phase 1
- ✓ Open Brain (Supabase knowledge base) integration for supplemental context — Phase 1 (infrastructure ready)
- ✓ Scheduled + manual Granola meeting transcript processing — Phase 2
- ✓ Contact card creation/update with full relationship context — Phase 2
- ✓ Contact categories (8 types) — Phase 2
- ✓ Link back to original Granola meeting URL on each contact — Phase 2
- ✓ Configurable outreach frequency per contact (days between touchpoints) — Phase 3
- ✓ AI-drafted outreach emails using z.ai GLM5, informed by contact context + user personality profile — Phase 3
- ✓ Drafts appear in both the app dashboard AND as Gmail drafts — Phase 3
- ✓ Daily draft review workflow: approve, edit+approve, send — Phase 3
- ✓ Open Brain context enrichment for draft generation — Phase 3

### Active
- [ ] Dashboard to view/search/filter all contacts
- [ ] Dashboard risk indicators: contacts at risk, triage needed, pending action items
- [ ] Settings panel: user personality/tone/style form, schedule configuration, API key management
- [ ] Open Brain (Supabase knowledge base) integration for supplemental context
- [ ] User profile form for tone, style, personality, projects, business objectives
- [ ] Configurable meeting processing schedule (e.g., every 2 hours, 8am-6pm PDT)

### Out of Scope

- Mobile app — web-first
- Real-time meeting processing — batch/scheduled approach chosen
- Calendar integration — Granola handles meeting capture
- SMS/Slack outreach — Gmail only for v1
- Contact import from other sources (LinkedIn, CRM) — Granola-sourced only for v1

## Context

- **Infrastructure**: Coolify on VPS for Next.js app and Trigger.dev worker. Supabase Cloud for database and storage.
- **AI Model**: z.ai GLM5 accessed via REST API with API key. Users provide their own key initially.
- **Data Sources**: Granola MCP server for meeting transcripts. Open Brain tables in user's Supabase for knowledge base context.
- **Outreach**: Gmail API via Google OAuth (same auth flow as login). Drafts created both in-app and in Gmail.
- **Scheduling**: Trigger.dev handles scheduled meeting processing and outreach draft generation.
- **Multi-tenant**: Each user has isolated data, their own Granola connection, their own Gmail, their own API keys.

## Constraints

- **AI Model**: z.ai GLM5 via REST API — must handle API key per user
- **Infrastructure**: Coolify deployment on VPS — no Vercel, no serverless assumptions
- **Data Access**: Granola via MCP server — need to bridge MCP into Trigger.dev scheduled jobs
- **Auth**: Google OAuth required — provides both authentication and Gmail API access
- **Storage**: Supabase Cloud — hosted, not self-hosted

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js for dashboard | SSR, API routes, React ecosystem, Coolify-compatible | — Pending |
| Supabase Cloud over self-hosted | Reduces ops burden, managed scaling | — Pending |
| Google OAuth for auth + Gmail | Single auth flow covers login + email access | — Pending |
| Trigger.dev for scheduling | Already set up in Coolify, handles cron + background jobs | — Pending |
| z.ai GLM5 for AI | User's chosen model, REST API compatible | — Pending |
| Batch processing over real-time | Configurable schedule, user controls processing windows | — Pending |
| Drafts in dashboard + Gmail | User can review in either place, flexibility | — Pending |

---
*Last updated: 2026-03-19 after Phase 3 completion*
