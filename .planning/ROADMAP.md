# Roadmap: ELITE Relationship Intelligence Agent

## Overview

ELITE delivers the full loop from "meeting happened" to "relationship maintained" across four phases. Phase 1 establishes multi-tenant infrastructure with Google OAuth and Supabase RLS -- the universal dependency and the phase where Gmail scope verification must begin (4-8 week external lead time). Phase 2 builds the core value proposition: Granola meeting ingestion, AI contact extraction, and contact card management. Phase 3 activates the outreach engine: scheduled draft generation, human-in-the-loop review, Gmail sync, and Open Brain context enrichment. Phase 4 layers dashboard intelligence on top: search, filtering, risk indicators, and analytics that make the product sticky.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Auth** - Multi-tenant infrastructure with Google OAuth, Supabase RLS, settings, and Granola access spike
- [ ] **Phase 2: Data Pipeline + Contacts** - Granola meeting ingestion, AI contact extraction, contact card CRUD, and basic contact list
- [ ] **Phase 3: Outreach Engine** - AI draft generation, human-in-the-loop review workflow, Gmail sync, and Open Brain enrichment
- [ ] **Phase 4: Dashboard Intelligence** - Search, filtering, risk indicators, analytics, and relationship health visibility

## Phase Details

### Phase 1: Foundation + Auth
**Goal**: Users can securely sign in, configure their account, and the platform is ready for multi-tenant operation with isolated data
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, TNNT-01, TNNT-02, TNNT-03
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google, and their session persists across browser refreshes
  2. User can store their z.ai API key and configure their meeting processing schedule from a settings panel
  3. User can fill out their personality/tone/style profile for AI drafting
  4. Each user's data is fully isolated -- one user cannot see another's contacts, settings, or credentials
  5. Gmail refresh token is captured during OAuth and stored encrypted for later API access
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: Data Pipeline + Contacts
**Goal**: Users see rich contact cards automatically created and updated from their Granola meeting transcripts
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07
**Success Criteria** (what must be TRUE):
  1. Meeting transcripts are automatically fetched from Granola on the user's configured schedule and can also be triggered manually
  2. Contact cards are created with extracted name, email, location, category, background, relationship context, action items, and notes -- without manual data entry
  3. Existing contacts are updated (not duplicated) when they appear in new meetings, with meeting history accumulating over time
  4. User can view their contacts in a list, assign categories, edit any field, set outreach frequency, and see linked Granola meeting URLs
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Outreach Engine
**Goal**: Users receive AI-drafted outreach emails informed by meeting context and personal style, review them in-app, and sync to Gmail
**Depends on**: Phase 1, Phase 2
**Requirements**: OUTR-01, OUTR-02, OUTR-03, OUTR-04, OUTR-05, OUTR-06, OUTR-07, OUTR-08, OBRN-01, OBRN-02
**Success Criteria** (what must be TRUE):
  1. Contacts due for outreach (based on their configured frequency) automatically receive AI-drafted emails using z.ai GLM5 with the user's API key
  2. Drafts are informed by contact meeting history, relationship context, action items, user personality profile, and Open Brain knowledge base
  3. Drafts appear both in the app dashboard and as Gmail drafts simultaneously
  4. User can approve, edit-then-approve, or dismiss each draft from the dashboard, and approved drafts send via Gmail
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Dashboard Intelligence
**Goal**: Users can efficiently navigate their network, spot at-risk relationships, and track outreach effectiveness through a polished dashboard
**Depends on**: Phase 2, Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07
**Success Criteria** (what must be TRUE):
  1. User can search contacts by name, email, category, or notes and filter the contact list by category
  2. Dashboard prominently shows contacts at risk of going stale (overdue for outreach) and contacts needing triage (new/unreviewed)
  3. Dashboard surfaces pending action items across all contacts so nothing falls through the cracks
  4. User can view outreach analytics: drafts sent, approval rates, and relationship health trends
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth | 0/3 | Not started | - |
| 2. Data Pipeline + Contacts | 0/3 | Not started | - |
| 3. Outreach Engine | 0/3 | Not started | - |
| 4. Dashboard Intelligence | 0/2 | Not started | - |
