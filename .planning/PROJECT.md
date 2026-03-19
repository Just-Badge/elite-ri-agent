# ELITE Relationship Intelligence Agent

## What This Is

A multi-tenant AI-powered relationship intelligence platform that automatically processes meeting transcripts from Granola, builds rich contact cards with full relationship context, and automates personalized outreach via Gmail. Users manage their network through a dashboard where they can review contacts, set outreach cadences, approve AI-drafted emails, and track relationship health — all powered by context from their meetings, knowledge base (Open Brain), and personal profile.

## Core Value

The agent must reliably turn raw meeting data into actionable relationship intelligence AND draft contextually-aware outreach emails — the full loop from "meeting happened" to "relationship maintained" without manual effort.

## Current State

**v1.0 MVP shipped 2026-03-19** — 4 phases, 13 plans, 188 tests, 14,322 LOC TypeScript

Tech stack: Next.js 15.5, Supabase Cloud (RLS), Trigger.dev v4, Google OAuth, Gmail API, z.ai GLM5, shadcn/ui, recharts

## Requirements

### Validated

- ✓ Multi-tenant auth via Google OAuth (doubles as Gmail authorization) — v1.0
- ✓ Settings panel: personality/tone/style form, schedule config, API key management — v1.0
- ✓ Configurable meeting processing schedule — v1.0
- ✓ Scheduled + manual Granola meeting transcript processing — v1.0
- ✓ Contact card creation/update with full relationship context — v1.0
- ✓ Contact categories (8 types) — v1.0
- ✓ Link back to original Granola meeting URL on each contact — v1.0
- ✓ Configurable outreach frequency per contact — v1.0
- ✓ AI-drafted outreach emails using z.ai GLM5 — v1.0
- ✓ Drafts appear in both app dashboard AND Gmail drafts — v1.0
- ✓ Draft review workflow: approve, edit+approve, send — v1.0
- ✓ Open Brain context enrichment for draft generation — v1.0
- ✓ Dashboard with search/filter all contacts — v1.0
- ✓ Risk indicators: contacts at risk, triage needed, pending actions — v1.0
- ✓ Outreach analytics: drafts sent, approval rates, health trends — v1.0

### Active

(No active requirements — start next milestone with `/gsd:new-milestone`)

### Out of Scope

- Mobile app — web-first
- Real-time meeting processing — batch/scheduled approach
- Calendar integration — Granola handles meeting capture
- SMS/Slack outreach — Gmail only for v1
- Contact import from other sources (LinkedIn, CRM) — Granola-sourced only for v1
- Auto-send emails — human-in-the-loop required
- Multiple AI models — z.ai GLM5 only for v1

## Context

- **Infrastructure**: Coolify on VPS for Next.js app and Trigger.dev worker. Supabase Cloud for database and storage.
- **AI Model**: z.ai GLM5 at api.z.ai/api/paas/v4/ via OpenAI SDK. Users provide their own key.
- **Data Sources**: Granola HTTP API (bearer token bridge for server-side), Open Brain tables in Supabase.
- **Outreach**: Gmail API via Google OAuth with fresh-draft-on-send pattern. Drafts in both app and Gmail.
- **Scheduling**: Trigger.dev handles meeting processing (hourly cron) and outreach draft generation (daily at start_hour).
- **Multi-tenant**: RLS on all tables with `(select auth.uid())` subselect caching pattern.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 15.5 (not 16) | Stable ecosystem, avoid breaking changes | ✓ Good |
| Supabase Cloud over self-hosted | Reduces ops burden, managed scaling | ✓ Good |
| Google OAuth for auth + Gmail | Single auth flow covers login + email access | ✓ Good |
| Trigger.dev for scheduling | Already in Coolify, handles cron + background jobs | ✓ Good |
| z.ai GLM5 via OpenAI SDK | OpenAI-compatible, baseURL override pattern | ✓ Good |
| Granola HTTP API (not MCP) | MCP can't run server-side in Trigger.dev | ✓ Good |
| Fresh-draft-on-send | Always create new Gmail draft from DB content before sending | ✓ Good |
| Email-based contact dedup | Simple, reliable, handles most cases | ✓ Good |
| Application-side frequency filtering | Supabase lacks interval arithmetic in RPC | ✓ Good |
| DB-first draft persistence | Draft saved to DB before Gmail sync (best-effort) | ✓ Good |

---
*Last updated: 2026-03-19 after v1.0 milestone*
