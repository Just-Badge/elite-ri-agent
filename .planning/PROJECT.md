# ELITE Relationship Intelligence Agent

## What This Is

A multi-tenant AI-powered relationship intelligence platform that automatically processes meeting transcripts from Granola, builds rich contact cards with full relationship context, and automates personalized outreach via Gmail. Users manage their network through a dashboard where they can review contacts, set outreach cadences, approve AI-drafted emails, and track relationship health — all powered by context from their meetings, knowledge base (Open Brain), and personal profile.

## Core Value

The agent must reliably turn raw meeting data into actionable relationship intelligence AND draft contextually-aware outreach emails — the full loop from "meeting happened" to "relationship maintained" without manual effort.

## Current State

**v1.1 Production-Grade UX/UI shipped 2026-03-20** — 8 phases total (v1.0 + v1.1), 22 plans, 188 tests, 16,256 LOC TypeScript, 144 source files

Tech stack: Next.js 15.5, Supabase Cloud (RLS), BullMQ + Redis (background jobs), Google OAuth, Gmail API, z.ai GLM5, shadcn/ui, recharts, next-themes

Live at: https://ri.elite.community

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

- ✓ Onboarding wizard with guided setup (Welcome → Granola → Profile → Process) — v1.1
- ✓ Unified empty states with contextual CTAs across all pages — v1.1
- ✓ Dark mode toggle with system preference default — v1.1
- ✓ Error boundaries on all crash-prone sections — v1.1
- ✓ AlertDialog confirmations on destructive actions — v1.1
- ✓ Header bar with dynamic breadcrumbs — v1.1
- ✓ Contact list pagination (24/page) — v1.1
- ✓ Skip-to-content, ARIA labels, aria-live, focus rings — v1.1
- ✓ Mobile responsive layout — v1.1

### Active

## Current Milestone: v1.2 Code Quality & DevOps

**Goal:** Harden the codebase — TypeScript strict mode, standardized API errors, env validation, CI/CD pipeline.

**Target:**
- TypeScript strict mode with zero build errors
- Standardized API error helpers across all routes
- Environment variable validation on startup
- GitHub Actions CI/CD pipeline

### Out of Scope

- Mobile app — web-first
- Real-time meeting processing — batch/scheduled approach
- Calendar integration — Granola handles meeting capture
- SMS/Slack outreach — Gmail only for v1
- Contact import from other sources (LinkedIn, CRM) — Granola-sourced only for v1
- Auto-send emails — human-in-the-loop required
- Multiple AI models — z.ai GLM5 only for v1

## Context

- **Infrastructure**: Coolify on VPS for Next.js app + BullMQ worker + Redis. Supabase Cloud for database and storage.
- **AI Model**: z.ai GLM5 at api.z.ai/api/paas/v4/ via OpenAI SDK. Users provide their own key.
- **Data Sources**: Granola MCP adapter (bearer token via WorkOS OAuth refresh), Open Brain tables in Supabase.
- **Outreach**: Gmail API via Google OAuth with fresh-draft-on-send pattern. Drafts in both app and Gmail.
- **Scheduling**: BullMQ + Redis handles meeting processing (hourly cron), outreach draft generation (daily at start_hour), and Granola token keepalive (every 6 hours).
- **Multi-tenant**: RLS on all tables with `(select auth.uid())` subselect caching pattern.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 15.5 (not 16) | Stable ecosystem, avoid breaking changes | ✓ Good |
| Supabase Cloud over self-hosted | Reduces ops burden, managed scaling | ✓ Good |
| Google OAuth for auth + Gmail | Single auth flow covers login + email access | ✓ Good |
| BullMQ + Redis for scheduling | Replaced Trigger.dev — Docker-native, no separate deploy step, shared Redis infra | ✓ Good |
| z.ai GLM5 via OpenAI SDK | OpenAI-compatible, baseURL override pattern | ✓ Good |
| Granola MCP adapter | MCP over Streamable HTTP with WorkOS OAuth token rotation | ✓ Good |
| Fresh-draft-on-send | Always create new Gmail draft from DB content before sending | ✓ Good |
| Email-based contact dedup | Simple, reliable, handles most cases | ✓ Good |
| Application-side frequency filtering | Supabase lacks interval arithmetic in RPC | ✓ Good |
| DB-first draft persistence | Draft saved to DB before Gmail sync (best-effort) | ✓ Good |

---
*Last updated: 2026-03-20 after v1.2 milestone started*
