# Requirements: ELITE Relationship Intelligence Agent

**Defined:** 2026-03-18
**Core Value:** Reliably turn raw meeting data into actionable relationship intelligence AND draft contextually-aware outreach emails -- the full loop from "meeting happened" to "relationship maintained"

## v1 Requirements

### Authentication & Infrastructure

- [x] **AUTH-01**: User can sign in with Google OAuth
- [x] **AUTH-02**: Google OAuth captures and persists Gmail refresh token for API access
- [x] **AUTH-03**: User session persists across browser refresh
- [x] **AUTH-04**: User can store and manage API keys (z.ai) via encrypted settings panel
- [x] **AUTH-05**: User can fill out profile form (tone, style, personality, projects, business objectives)
- [x] **AUTH-06**: User can configure meeting processing schedule (interval, start/end time, timezone)

### Data Pipeline

- [x] **DATA-01**: Scheduled Trigger.dev job fetches new Granola meetings on user-defined interval
- [ ] **DATA-02**: User can manually trigger meeting processing from dashboard
- [x] **DATA-03**: AI extracts contact information (name, email, location) from meeting transcripts
- [x] **DATA-04**: AI extracts relationship context (why, what, mutual value, status) from transcripts
- [x] **DATA-05**: AI extracts action items and tasks from meeting transcripts
- [x] **DATA-06**: AI extracts key notes and bullet points from meetings
- [x] **DATA-07**: System creates new contact cards or updates existing ones (deduplication by email)
- [x] **DATA-08**: Each contact links back to original Granola meeting URL

### Contact Management

- [x] **CONT-01**: Contact card displays: name, email, location, category, background, relationship context
- [x] **CONT-02**: Contact card includes meeting history with linked Granola URLs
- [x] **CONT-03**: Contact card includes action items and tasks
- [x] **CONT-04**: Contact card includes notes/bullet points for memory jogging
- [x] **CONT-05**: User can assign contact categories (advisors, investors, team members, networking, business partners, collaborators, etc.)
- [ ] **CONT-06**: User can edit any field on a contact card
- [x] **CONT-07**: User can set outreach frequency per contact (days between touchpoints)

### Dashboard

- [ ] **DASH-01**: User can view all contacts in a browsable list/grid
- [ ] **DASH-02**: User can search contacts by name, email, category, or notes
- [ ] **DASH-03**: User can filter contacts by category
- [ ] **DASH-04**: Dashboard shows contacts at risk (overdue for outreach)
- [ ] **DASH-05**: Dashboard shows contacts needing triage (new/unreviewed)
- [ ] **DASH-06**: Dashboard shows pending action items across all contacts
- [ ] **DASH-07**: Dashboard displays outreach analytics (drafts sent, response tracking, health trends)

### Outreach Engine

- [ ] **OUTR-01**: Scheduled Trigger.dev job identifies contacts due for outreach based on frequency
- [ ] **OUTR-02**: AI drafts personalized email using contact context + user profile + Open Brain knowledge
- [ ] **OUTR-03**: Draft uses z.ai GLM5 model via REST API with user's API key
- [ ] **OUTR-04**: Draft appears in app dashboard for review
- [ ] **OUTR-05**: Draft is simultaneously created as Gmail draft via Gmail API
- [ ] **OUTR-06**: User can approve draft and send from dashboard
- [ ] **OUTR-07**: User can edit draft before approving and sending
- [ ] **OUTR-08**: User can dismiss/delete a draft

### Open Brain Integration

- [ ] **OBRN-01**: System reads from user's Open Brain tables in Supabase for supplemental context
- [ ] **OBRN-02**: Open Brain context enriches AI draft generation with user's knowledge/thoughts

### Multi-Tenancy

- [x] **TNNT-01**: Each user's data is fully isolated via Supabase RLS
- [x] **TNNT-02**: Each user has independent Granola connection, Gmail auth, and API keys
- [x] **TNNT-03**: Processing schedules are per-user and isolated

## v2 Requirements

### Notifications

- **NOTF-01**: User receives in-app notifications for new contacts detected
- **NOTF-02**: User receives email digest of contacts at risk
- **NOTF-03**: User receives alerts when action items are overdue

### Advanced Intelligence

- **INTL-01**: AI suggests optimal outreach timing based on relationship history
- **INTL-02**: AI auto-categorizes contacts based on meeting context
- **INTL-03**: Relationship strength scoring with trend tracking
- **INTL-04**: Automated follow-up suggestions based on action items

### Import/Export

- **IMEX-01**: User can manually add contacts without a meeting
- **IMEX-02**: User can export contacts to CSV
- **IMEX-03**: User can import contacts from CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, mobile later |
| LinkedIn/CRM import | Granola-sourced only for v1 -- keeps data pipeline simple |
| SMS/Slack outreach | Gmail only for v1 -- reduces integration surface |
| Real-time meeting processing | Batch/scheduled approach -- simpler architecture, user controls timing |
| Calendar integration | Granola handles meeting capture -- no direct calendar needed |
| Auto-send emails | Human-in-the-loop required -- drafts must be reviewed before sending |
| Multiple AI models | z.ai GLM5 only for v1 -- can expand later |
| Team shared contacts | Each user's contacts are private for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| DATA-08 | Phase 2 | Complete |
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CONT-04 | Phase 2 | Complete |
| CONT-05 | Phase 2 | Complete |
| CONT-06 | Phase 2 | Pending |
| CONT-07 | Phase 2 | Complete |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| DASH-07 | Phase 4 | Pending |
| OUTR-01 | Phase 3 | Pending |
| OUTR-02 | Phase 3 | Pending |
| OUTR-03 | Phase 3 | Pending |
| OUTR-04 | Phase 3 | Pending |
| OUTR-05 | Phase 3 | Pending |
| OUTR-06 | Phase 3 | Pending |
| OUTR-07 | Phase 3 | Pending |
| OUTR-08 | Phase 3 | Pending |
| OBRN-01 | Phase 3 | Pending |
| OBRN-02 | Phase 3 | Pending |
| TNNT-01 | Phase 1 | Complete |
| TNNT-02 | Phase 1 | Complete |
| TNNT-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after roadmap creation*
