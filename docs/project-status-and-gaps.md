# Elite RI Agent — Project Status, Gap Analysis & Next Steps

*Generated: 2026-03-22 — Updated: 2026-03-22 (BullMQ migration)*

---

## Where You Are Right Now

### Milestones Completed
| Milestone | Phases | Plans | Status |
|-----------|--------|-------|--------|
| **v1.0 MVP** | 1-4 (13 plans) | Foundation, Data Pipeline, Outreach, Dashboard | SHIPPED 2026-03-19 |
| **v1.1 Production UX** | 5-8 (9 plans) | Onboarding, Safety, Navigation, Accessibility | SHIPPED 2026-03-20 |
| **v1.2 Code Quality** | 9 (3 plans) | TypeScript strict, API errors, env validation, CI | SHIPPED 2026-03-21 |

### What's Actually Built & Working
- Google OAuth login + multi-tenant auth with RLS
- Granola meeting sync (hourly cron via Trigger.dev) — **just got working today**
- AI contact extraction from meeting transcripts (z.ai GLM5)
- Contact management with 8 categories, risk scoring, dedup
- Outreach draft generation + Gmail integration (create + send)
- Dashboard with stats, risk alerts, outreach analytics
- Onboarding wizard, dark mode, error boundaries, breadcrumbs
- 35 test files, TypeScript strict mode, GitHub Actions CI
- Settings: profile, schedule, integrations (Granola OAuth)
- Mobile responsive, accessibility (ARIA, focus, skip-to-content)

### What Just Got Fixed (This Session)
- **Replaced Trigger.dev with BullMQ + Redis** — Trigger.dev self-hosted was fundamentally mismatched for Docker VPS deployment (required Docker Desktop, separate deploy step, broken supervisor). BullMQ is a library + Redis container — Docker-native, no vendor dependency, shared infrastructure across all future apps.
- Added Granola token-keepalive job (every 6 hours) to prevent refresh token expiry during inactivity
- Added Bull Board monitoring dashboard at `/admin/queues`

---

## Gap Analysis: Planning Docs vs Reality

### Requirements Fully Met (v1.0 + v1.1 + v1.2)

All 46 tracked requirements across 3 milestones are marked complete in the planning docs. The code exists for each. **However, many features have never been tested in production** because Trigger.dev was broken until today.

### Features That Exist in Code But Are Unverified End-to-End

| Feature | Code Exists | E2E Tested in Prod? | Risk |
|---------|-------------|---------------------|------|
| Meeting sync pipeline | Yes | **NO** — Trigger.dev just started working | HIGH |
| AI contact extraction | Yes | **NO** — depends on meetings flowing through | HIGH |
| Contact dedup (email match → name match → insert) | Yes | **NO** — needs real meeting data | MEDIUM |
| Outreach draft generation | Yes | **NO** — depends on contacts existing | HIGH |
| Gmail draft creation + send | Yes | **UNKNOWN** — Gmail `compose` scope needs Google security review | HIGH |
| Granola OAuth token refresh | Yes | **UNKNOWN** — single-use refresh tokens are fragile | HIGH |
| Open Brain context enrichment | Yes | **UNKNOWN** — needs API key in user_settings | MEDIUM |
| Processing schedule (time windows) | Yes | **NO** — Trigger.dev was broken | LOW |

### Known Blockers

1. **Gmail `gmail.compose` restricted scope** — Requires Google security assessment (4-8 weeks). Without this, users can't send emails. This is called out in STATE.md as a blocker.

2. **Granola API approach changed** — ~~PROJECT.md says "Granola HTTP API (not MCP)" but the code actually uses MCP adapter now.~~ FIXED: Planning docs updated to reflect MCP adapter.

3. **No production traffic yet** — No real users have used the app. Everything is developer-tested only.

### Planned But Not Started (v1.2+ from v1.1-REQUIREMENTS.md)

| Feature | Requirement ID | Notes |
|---------|---------------|-------|
| Multiple Google/email sending accounts | MULT-01, MULT-02 | Deferred to future milestone |
| Real-time notifications | NOTF-01 | Deferred |
| CSV contact export | IMEX-01 | Deferred |
| Bulk select contacts/drafts | BULK-01 | Deferred |

### Docs/Config That Are Stale

| Item | Issue |
|------|-------|
| PROJECT.md Key Decisions | Says "Granola HTTP API (not MCP)" but code uses MCP adapter |
| v1.2-ROADMAP.md | Still shows Phase 9 as "0/3 plans" and "Not started" but v1.2-REQUIREMENTS.md says SHIPPED |
| README.md | Still the default Next.js template — not project documentation |
| .planning/STATE.md | Says "status: unknown" but should be "complete" |

---

## Ideas: What To Do Next

### Tier 1: Critical (Do Before Anything Else)

1. **Verify the meeting pipeline end-to-end** — Trigger.dev JUST started working. Watch the queued runs execute. Check if meetings are actually being fetched from Granola, contacts extracted, and stored in Supabase. This is the core value proposition.

2. **Check Granola token refresh** — The OAuth refresh tokens are single-use. If refresh fails, the pipeline silently stops working. Test that the token refresh cycle actually works.

3. **Start Google security review for Gmail scope** — This is a 4-8 week process. Every day you delay is a day added to launch timeline. Apply at https://console.cloud.google.com/apis/credentials/consent

4. **Cancel stale queued runs** — 20+ runs accumulated while Trigger.dev was broken. Some may have stale data or trigger errors. Consider canceling old ones and letting fresh crons create new ones.

### Tier 2: High Value (Solidify What's Built)

5. **Write a real README** — Replace the Next.js template with actual project docs. Setup instructions, env vars, architecture diagram, deployment steps.

6. **Manual smoke test every page** — Click through the entire app: login → dashboard → contacts → contact detail → drafts → settings → integrations. Screenshot any broken UI.

7. **Fix stale planning docs** — Update PROJECT.md (MCP not HTTP), v1.2-ROADMAP.md (mark complete), STATE.md status.

8. **Run the test suite and fix failures** — `npm test` to see if all 35 test files still pass after recent changes. There are modified test files in the working tree.

9. **Add monitoring/alerting** — Sentry for error tracking, or at minimum a health check endpoint that verifies Supabase + Trigger.dev connectivity.

### Tier 3: Product Improvements

10. **Improve AI extraction quality** — Once meetings are flowing, review the AI output. Are contacts being extracted accurately? Are action items useful? Iterate on prompts.

11. **Contact enrichment** — Pull LinkedIn, company info, or other public data to fill out contact cards beyond what meetings provide.

12. **Rich text draft editor** — Replace plain textarea with a markdown or rich text editor for email drafts.

13. **CSV export** — Simple but high-value feature for users who want their contact data in spreadsheets.

14. **Dashboard improvements** — Add date range filters, more chart types, contact growth over time.

15. **Bulk actions** — Select multiple contacts for category changes, or multiple drafts for batch send/dismiss.

### Tier 4: Architecture & DevOps

16. **E2E tests with Playwright** — Critical user flows (login → connect Granola → wait for sync → view contacts → send draft).

17. **Database backups** — Supabase handles this, but verify the backup schedule and test a restore.

18. **Rate limiting** — Protect API routes from abuse. Especially `/api/meetings/process`.

19. **Logging & observability** — Structured logging in API routes and Trigger.dev tasks. Ship to a log aggregator.

20. **Performance audit** — Lighthouse scores, Core Web Vitals, SSR optimization.

### Tier 5: Future Features (From Planning Docs)

21. **Multiple email accounts** — Support Gmail + Outlook, or multiple Gmail accounts per user.
22. **Real-time notifications** — WebSocket or polling for "your meetings were processed" alerts.
23. **PWA support** — Offline access, push notifications.
24. **LinkedIn integration** — Import contacts, cross-reference with meeting data.
25. **Team features** — Shared contacts, team dashboards, handoff workflows.

---

## Recommended Order of Operations

```
Week 1: Verify & Stabilize
├── [1] Watch Trigger.dev runs complete — verify meeting pipeline
├── [2] Test Granola token refresh cycle
├── [3] Start Google security review for Gmail scope
├── [4] Cancel stale queued runs
├── [6] Smoke test every page
└── [8] Run test suite, fix failures

Week 2: Polish & Document
├── [5] Write real README
├── [7] Fix stale planning docs
├── [10] Review AI extraction quality, iterate prompts
└── [9] Add basic error monitoring

Week 3+: Build Forward
├── Pick from Tier 3/4/5 based on user feedback
├── Start onboarding real users
└── Define v1.3 milestone requirements
```

---

## Quick Commands Reference

```bash
# Run the app locally
npm run dev

# Run tests
npm test

# Deploy Trigger.dev tasks
npm run trigger:deploy

# Check Trigger.dev run status (via MCP)
# Use the trigger MCP tools: list_runs, get_run_details

# Check Coolify service status
curl -s "https://app.coolify.io/api/v1/services/zc0kkc484gow04sc8ggs00gg" \
  -H "Authorization: Bearer <coolify-token>" \
  -H "Accept: application/json" | python3 -m json.tool
```
