# Feature Research

**Domain:** Relationship Intelligence / Personal CRM with AI-Powered Outreach
**Researched:** 2026-03-18
**Confidence:** HIGH (multiple competitors analyzed, patterns consistent across products)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Contact cards with structured fields | Every CRM has them. Users need name, email, company, location, notes at minimum. Without structured data, it's just a notes app. | MEDIUM | Must auto-populate from Granola transcripts. Fields: name, email, location, company, role, background, notes. Avoid requiring manual entry. |
| Contact search and filtering | Clay, Dex, Folk all offer search by name, company, tag, location, last-contacted date. Users won't scroll through a list. | LOW | Full-text search across contact fields. Filter by category, last contact date, tags. |
| Contact categorization/tagging | Every personal CRM supports tags or groups. Users need to segment by relationship type (investor, advisor, team, networking). | LOW | Use both fixed categories (from PROJECT.md) AND flexible user-defined tags. Tags should be multi-assignable (one contact = multiple tags). |
| Interaction history/timeline | Cloze, Clay, Affinity all show chronological history of interactions per contact. Without this, users lose context. | MEDIUM | Meeting history from Granola with timestamps and links back to source. Email outreach history. |
| Reminder/follow-up system | Dex, Clay, and Cloze all center on "don't let relationships go cold." Configurable frequency per contact is the baseline. | MEDIUM | Per-contact cadence (days between touchpoints). Daily digest of who needs attention. This IS the core value loop. |
| Dashboard overview | Every competitor has a home/overview screen showing pending actions, upcoming reminders, recent activity. | MEDIUM | Must surface: contacts at risk, pending drafts for review, recent meeting processing results, upcoming follow-ups. |
| Google OAuth login | Standard for any app touching Gmail. Users expect SSO, not separate credentials. | LOW | Already planned. Single auth flow covers login + Gmail API access. |
| Gmail draft creation | If the product promises email outreach, drafts must appear where the user already works. Cloze and Folk both sync to email clients. | MEDIUM | Dual-write: drafts in dashboard AND Gmail. Users should be able to review in either place. |
| Settings/preferences panel | Users expect to configure their experience. API keys, processing schedule, notification preferences. | LOW | User profile (tone/style), API key management, schedule config, category management. |
| Data privacy/isolation | Multi-tenant expectation. Users assume their contacts and conversations are private. | MEDIUM | Row-level security in Supabase. Each user's data fully isolated. No cross-tenant data leakage. |

### Differentiators (Competitive Advantage)

Features that set ELITE apart. Not required by the market, but these ARE the product's value proposition.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Automatic contact extraction from meeting transcripts | Clay and Dex require manual import or social media sync. ELITE auto-builds contact cards from Granola meetings -- zero manual entry for the primary data source. This is the core differentiator. | HIGH | NLP extraction of names, roles, companies, discussion topics, action items, relationship signals from meeting transcripts. Must handle multi-person meetings. |
| AI-drafted personalized outreach emails | Most personal CRMs stop at "remind you to reach out." ELITE writes the email for you, using meeting context + user personality profile + knowledge base. Cloze does basic AI emails but without deep meeting context. | HIGH | z.ai GLM5 drafting with context from: contact card, meeting history, user profile (tone/style/personality), Open Brain knowledge base. Must feel personal, not templated. |
| Human-in-the-loop draft review workflow | Full automation is risky for relationship outreach. The approve/edit/send workflow gives users confidence while removing the effort of drafting. This is the pattern recommended by industry best practices. | MEDIUM | Daily batch of drafts. Three actions: approve (send as-is), edit + approve, dismiss. Must be fast -- user should be able to process 10 drafts in under 5 minutes. |
| Meeting-sourced relationship context | Contact cards enriched with what was actually discussed, not just metadata. "Discussed Series A timeline, concerned about burn rate" is more valuable than "Met on March 15." | HIGH | Extract key topics, sentiment, action items, commitments, questions raised from each meeting. Append to contact card as structured relationship context. |
| Relationship health indicators | Clay shows "last contacted" but doesn't score relationship health. ELITE can compute risk based on: days since last contact vs. configured cadence, missed follow-ups, unresolved action items. | MEDIUM | Simple scoring: green (on track), yellow (approaching cadence deadline), red (overdue). Factor in: configured cadence, last interaction date, pending action items. |
| User personality/tone profile for AI drafting | No competitor lets you define your communication style for AI to match. This prevents AI drafts from sounding generic. | LOW | Form-based: communication style, formality level, typical greetings/closings, industry jargon preferences, personal projects/interests to reference. |
| Open Brain knowledge base integration | Supplemental context from user's existing knowledge base makes outreach more relevant. No competitor has this. | MEDIUM | Pull relevant context from Supabase Open Brain tables when drafting emails. If user has notes on a company or project, AI can reference them. |
| Configurable processing schedule | Most tools process immediately or on fixed schedules. ELITE lets users control when meeting processing happens (business hours only, specific intervals). | LOW | Trigger.dev cron with user-configurable windows. Default: every 2 hours during 8am-6pm user timezone. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific product.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-channel outreach (SMS, Slack, LinkedIn) | Users want to reach contacts wherever they are. | Massive scope expansion. Each channel has its own API, authentication, rate limits, formatting. LinkedIn automation violates ToS. SMS requires phone number collection. Gmail is sufficient for v1 professional outreach. | Gmail-only for v1. Add channels only after core loop is validated. |
| Real-time meeting processing | Users want instant contact updates during/after meetings. | Requires streaming integration with Granola, websocket infrastructure, and real-time NLP pipeline. Batch processing is simpler, more reliable, and sufficient for relationship management (not time-critical). | Configurable batch schedule (every 2 hours). Users can trigger manual processing for urgent meetings. |
| Contact import from LinkedIn/social media | Users want to bulk-import their LinkedIn network. | Creates noise -- hundreds of weak contacts dilute the value of relationship intelligence. Also, LinkedIn scraping is fragile and violates ToS. Data quality is low (outdated profiles). | Granola-sourced contacts only for v1. Every contact has real meeting context, which is the product's value. Manual add for key contacts not yet met via Granola. |
| Full CRM pipeline/deal tracking | Business users expect deal stages, revenue forecasting, pipeline views. | Turns the product into Salesforce-lite. Relationship intelligence is personal, not transactional. Pipeline adds massive complexity (stages, custom fields, reporting, forecasting). | Focus on relationship health, not deal flow. Tag contacts by category (investor, advisor) but don't build pipeline management. |
| Auto-send emails without approval | Power users want to skip the review step for routine outreach. | AI-generated emails sent without human review risk embarrassing mistakes, wrong tone, hallucinated context, or sending to wrong contacts. Relationship damage is hard to undo. | Always require explicit approval. Make the approval flow fast enough that it doesn't feel burdensome. Batch review design (approve 10 drafts in 2 minutes). |
| Calendar integration for meeting capture | Users expect calendar sync for meeting context. | Granola already handles meeting capture. Duplicating calendar integration adds complexity and potential data conflicts. | Rely on Granola as the single source of meeting data. Granola already captures calendar meetings. |
| Mobile app | Users want mobile access to contacts and draft approvals. | Native mobile development doubles engineering effort. Responsive web covers 90% of use cases for a review/approval workflow. | Responsive web design from day one. PWA potential for v2 if mobile demand is validated. |
| Contact deduplication engine | Duplicate contacts across meetings are inevitable. | Building a robust deduplication engine (fuzzy name matching, email normalization, merge workflows) is surprisingly complex. Edge cases abound (same name different person, nicknames, etc.). | Simple exact-match deduplication on email address for v1. Flag potential duplicates (same name, no email) for manual review. Full merge engine is v2. |
| Bulk email campaigns | Users may want to send the same outreach to a group. | Turns the product into a mass email tool. Contradicts the "personalized relationship management" value prop. Also triggers spam filters and deliverability issues. | Each email is individually drafted and contextually personalized. Group outreach is done one-at-a-time with AI assistance, not bulk blast. |

## Feature Dependencies

```
[Google OAuth Auth]
    |--enables--> [Gmail Draft Creation]
    |--enables--> [User Data Isolation]
    |--enables--> [Settings Panel]

[Granola MCP Integration]
    |--enables--> [Meeting Transcript Processing]
                      |--enables--> [Contact Card Auto-Creation]
                      |                   |--enables--> [Contact Search/Filter]
                      |                   |--enables--> [Contact Categorization]
                      |                   |--enables--> [Interaction Timeline]
                      |--enables--> [Meeting-Sourced Relationship Context]
                      |--enables--> [Action Item Extraction]

[Contact Cards] + [Cadence Configuration]
    |--enables--> [Relationship Health Indicators]
    |--enables--> [Follow-up Reminders]
    |--enables--> [Dashboard Risk View]

[Contact Cards] + [User Profile] + [Open Brain Integration]
    |--enables--> [AI Email Drafting]
                      |--enables--> [Gmail Draft Sync]
                      |--enables--> [Draft Review Workflow]
                                        |--enables--> [Email Sending]

[Trigger.dev Scheduled Jobs]
    |--enables--> [Configurable Processing Schedule]
    |--enables--> [Daily Draft Generation]
    |--enables--> [Cadence Monitoring]
```

### Dependency Notes

- **Google OAuth is the foundation:** Everything downstream requires authentication. Gmail access and data isolation both depend on it. Must be phase 1.
- **Granola MCP is the data pipeline:** Without meeting transcript processing, there are no contacts, no context, no relationship intelligence. This is the second critical dependency.
- **Contact cards must exist before outreach:** AI drafting requires contact context. The extraction pipeline must be working before email generation makes sense.
- **User profile enhances but doesn't block drafting:** AI can draft emails without a personality profile (using defaults), but quality improves significantly with one. Can be added iteratively.
- **Open Brain is an enhancement layer:** Useful for richer context in drafts, but not a blocker. Can be wired in after core drafting works.
- **Dashboard is the integration point:** All features surface through the dashboard, but individual features can be built and tested before the dashboard is polished.

## MVP Definition

### Launch With (v1)

Minimum viable product -- validate the core loop of "meeting to contact to outreach."

- [ ] **Google OAuth login** -- Foundation for all user-facing features and Gmail access
- [ ] **Granola transcript ingestion** -- The data source that makes everything else possible
- [ ] **Automatic contact card creation** -- Core value: zero-effort contact building from meetings
- [ ] **Basic contact fields extraction** -- Name, email, company, role, meeting context
- [ ] **Contact dashboard with search/filter** -- Users need to see and find their contacts
- [ ] **Contact categorization** -- Organize by relationship type (investor, advisor, networking, etc.)
- [ ] **Per-contact outreach cadence** -- Configurable days-between-touchpoints
- [ ] **Relationship health indicators** -- Green/yellow/red based on cadence compliance
- [ ] **AI-drafted outreach emails** -- z.ai GLM5 drafts using contact context + user profile
- [ ] **Draft review workflow** -- Approve, edit+approve, dismiss in dashboard
- [ ] **Gmail draft sync** -- Approved drafts appear in Gmail
- [ ] **User profile form** -- Tone, style, personality for AI drafting
- [ ] **Basic settings panel** -- API keys, processing schedule configuration
- [ ] **Scheduled meeting processing** -- Trigger.dev cron for batch Granola ingestion

### Add After Validation (v1.x)

Features to add once the core loop is working and users confirm value.

- [ ] **Open Brain knowledge base integration** -- Richer AI drafts with supplemental context from user's existing knowledge base
- [ ] **Interaction timeline per contact** -- Full chronological history of meetings + emails
- [ ] **Action item tracking** -- Extract and track action items from meetings, surface unresolved items
- [ ] **Advanced meeting context extraction** -- Sentiment, key topics, commitments, concerns extracted from transcripts
- [ ] **Dashboard analytics** -- Contact growth over time, outreach completion rates, response tracking
- [ ] **Email response tracking** -- Detect when contacts reply, update relationship health accordingly
- [ ] **Bulk draft review** -- Process multiple pending drafts efficiently in a single view
- [ ] **Manual contact creation** -- Add contacts not sourced from Granola meetings
- [ ] **Contact notes** -- User-added notes beyond auto-extracted meeting context

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Smart deduplication engine** -- Fuzzy matching, merge workflows for duplicate contacts
- [ ] **Multi-channel outreach** -- Slack DMs, LinkedIn messages (if APIs allow) beyond Gmail
- [ ] **Team/shared workspaces** -- Multiple users sharing contact intelligence (requires permission model)
- [ ] **Contact enrichment from external sources** -- LinkedIn profiles, company data, news mentions
- [ ] **Mobile PWA** -- Installable mobile experience for on-the-go draft approval
- [ ] **Outreach templates** -- Reusable email templates for common scenarios (intro, follow-up, thank you)
- [ ] **Calendar integration** -- Direct calendar sync as alternative/supplement to Granola
- [ ] **Webhook notifications** -- Push notifications for at-risk contacts, new drafts ready
- [ ] **Export/reporting** -- CSV export, relationship reports, network visualization

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Google OAuth login | HIGH | LOW | P1 |
| Granola transcript ingestion | HIGH | HIGH | P1 |
| Auto contact card creation | HIGH | HIGH | P1 |
| Contact dashboard + search | HIGH | MEDIUM | P1 |
| Contact categorization/tags | MEDIUM | LOW | P1 |
| Per-contact outreach cadence | HIGH | LOW | P1 |
| Relationship health indicators | HIGH | MEDIUM | P1 |
| AI-drafted outreach emails | HIGH | HIGH | P1 |
| Draft review workflow | HIGH | MEDIUM | P1 |
| Gmail draft sync | HIGH | MEDIUM | P1 |
| User profile form | MEDIUM | LOW | P1 |
| Settings panel | MEDIUM | LOW | P1 |
| Scheduled processing (Trigger.dev) | HIGH | MEDIUM | P1 |
| Open Brain integration | MEDIUM | MEDIUM | P2 |
| Interaction timeline | MEDIUM | MEDIUM | P2 |
| Action item tracking | MEDIUM | HIGH | P2 |
| Advanced context extraction | MEDIUM | HIGH | P2 |
| Email response tracking | MEDIUM | MEDIUM | P2 |
| Manual contact creation | LOW | LOW | P2 |
| Contact notes | LOW | LOW | P2 |
| Smart deduplication | MEDIUM | HIGH | P3 |
| Multi-channel outreach | LOW | HIGH | P3 |
| Team workspaces | LOW | HIGH | P3 |
| External enrichment | MEDIUM | HIGH | P3 |
| Mobile PWA | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- validates the core loop
- P2: Should have, add after core loop is working
- P3: Nice to have, defer until product-market fit

## Competitor Feature Analysis

| Feature | Clay.earth | Dex | Folk | Cloze | Monica | ELITE Approach |
|---------|-----------|-----|------|-------|--------|----------------|
| Contact source | Social media, email, calendar imports | LinkedIn, Facebook, Gmail sync | Chrome extension, LinkedIn, email | Email, phone, social auto-sync | Manual entry only | Granola meeting transcripts (automatic, context-rich) |
| Contact enrichment | Auto life updates, social data | LinkedIn profile sync | AI magic fields, data enrichment | Auto-aggregation from apps | None | AI extraction from meeting content + Open Brain |
| Reminders/follow-ups | Review dashboard, reconnect prompts | Configurable reminders, birthday sync | Follow-up Assistant with AI suggestions | AI-powered daily follow-up suggestions | Manual reminders, birthdays | Configurable cadence + relationship health scoring + AI drafts |
| AI email drafting | None (manual outreach) | None | Basic AI suggestions | Basic AI email writing | None | Deep contextual drafting with user personality, meeting history, knowledge base |
| Draft review/approval | N/A | N/A | N/A | N/A | N/A | Full human-in-the-loop workflow (unique differentiator) |
| Relationship intelligence | Social activity tracking, Nexus AI Q&A | Timeline of interactions | Recap Assistant (AI summaries) | AI relationship strength scoring | None | Meeting-sourced context, health indicators, action item tracking |
| Meeting integration | None native | None native | None native | None native | None | Granola MCP (core data pipeline) |
| Search/filtering | Advanced (location, company, recency) | Tags, custom views, notes search | Custom fields, filters | Auto-organized by relationship strength | Basic search | Category + tag + full-text search across all contact fields |
| Mobile | iOS/Android apps | iOS/Android apps | Mobile web | iOS/Android apps | Self-hosted web | Responsive web (v1), PWA potential (v2) |
| Pricing model | Free (1K contacts), Pro $20/mo | Free trial, paid plans | Free tier, Standard $20/user/mo | Free tier, paid plans | Free (self-hosted), hosted plans | Self-hosted (user provides API key for AI) |

### Key Competitive Insights

1. **No competitor combines meeting transcript processing with AI outreach drafting.** This is a genuine gap in the market. Clay and Dex are strong on contact management but weak on proactive outreach. Cloze does basic AI emails but without meeting context depth.

2. **Human-in-the-loop draft review is unique.** No personal CRM offers a structured approve/edit/send workflow for AI-drafted emails. Most either auto-send (risky) or just remind (no help with the actual writing).

3. **Meeting-sourced contacts are higher quality than social imports.** Every ELITE contact comes with real interaction context, not just a LinkedIn profile scrape. This is a quality-over-quantity advantage.

4. **The "full loop" is the differentiator.** Meeting happened --> contact created --> context extracted --> outreach drafted --> user reviews --> email sent --> relationship tracked. No competitor does this end-to-end.

## Sources

- [Clay.earth](https://clay.earth/) -- Personal CRM with social sync and Review dashboard
- [Clay.earth Review (Muncly)](https://muncly.com/clay-earth-review-is-this-an-end-game-personal-crm/) -- Detailed feature analysis
- [Clay Review (Productive with Chris)](https://productivewithchris.com/tools/clay-personal-crm/) -- Feature walkthrough
- [Dex CRM](https://getdex.com/) -- Personal CRM with reminder system
- [Dex CRM Review (The Process Hacker)](https://theprocesshacker.com/blog/dex-crm-review/) -- Feature deep-dive
- [Folk CRM](https://www.folk.app/) -- AI-powered relationship CRM
- [Folk CRM Review (Best AI CRM Software)](https://bestaicrmsoftware.com/crm-for-small-business/folk-review-ai-relationship-manager) -- AI features analysis
- [Cloze CRM](https://ai.cloze.com/) -- AI-powered relationship management
- [Cloze Review (Automaton Army)](https://automatonarmy.com/cloze-review/) -- Auto-tracking features
- [Monica CRM (GitHub)](https://github.com/monicahq/monica) -- Open-source personal CRM
- [Affinity CRM](https://www.affinity.co/product/crm) -- Relationship intelligence for deal-driven teams
- [Affinity Relationship Intelligence](https://www.affinity.co/blog/relationship-intelligence) -- Deep dive on RI features
- [Introhive Relationship Intelligence Guide](https://www.introhive.com/blog/relationship-intelligence-automation/) -- Industry definition and patterns
- [Granola AI](https://www.granola.ai/) -- Meeting notes AI with CRM integrations
- [Granola HubSpot Integration](https://www.granola.ai/blog/granola-hubspot-integration-crm-updates) -- CRM sync patterns
- [Best Personal CRM Tools 2026 (Wave Connect)](https://wavecnct.com/blogs/news/personal-crm) -- Market overview
- [n8n Human Oversight Playbook](https://blog.n8n.io/production-ai-playbook-human-oversight/) -- Human-in-the-loop patterns
- [AI Outreach Tools (GenFuse)](https://genfuseai.com/blog/ai-outreach-tools) -- Outreach automation landscape

---
*Feature research for: Relationship Intelligence / Personal CRM with AI-Powered Outreach*
*Researched: 2026-03-18*
