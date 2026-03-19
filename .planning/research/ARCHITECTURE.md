# Architecture Patterns

**Domain:** Multi-tenant AI-powered relationship intelligence platform
**Researched:** 2026-03-18

## Recommended Architecture

### High-Level System Overview

```
                          +---------------------+
                          |     User Browser     |
                          +----------+----------+
                                     |
                          +----------v----------+
                          |   Next.js App        |
                          |  (Coolify / VPS)     |
                          |                      |
                          |  - Dashboard UI      |
                          |  - API Routes        |
                          |  - Auth (Google)     |
                          +--+------+-------+---+
                             |      |       |
              +--------------+      |       +---------------+
              |                     |                       |
    +---------v--------+  +--------v---------+   +---------v---------+
    |  Supabase Cloud  |  | Trigger.dev      |   |   External APIs   |
    |                  |  | (Coolify / VPS)  |   |                   |
    |  - Auth          |  |                  |   |  - Gmail API      |
    |  - Database      |  |  - Cron Jobs     |   |  - z.ai GLM-5     |
    |  - RLS           |  |  - MCP Bridge    |   |  - Granola API    |
    |  - Open Brain    |  |  - Email Draft   |   |                   |
    +------------------+  +------------------+   +-------------------+
```

The system has four primary layers, following the standard relationship intelligence lifecycle of **Capture -> Enrich -> Analyze -> Activate**:

1. **Capture Layer**: Scheduled Trigger.dev tasks pull meeting data from Granola
2. **Enrich Layer**: AI (z.ai GLM-5) processes transcripts into structured contact cards
3. **Analyze Layer**: Dashboard surfaces relationship health, risk indicators, action items
4. **Activate Layer**: AI drafts outreach emails, pushed to Gmail as drafts

### Component Boundaries

| Component | Responsibility | Communicates With | Deployment |
|-----------|---------------|-------------------|------------|
| **Next.js Dashboard** | UI rendering, API routes, auth flow, draft review workflow | Supabase (data), Gmail API (draft sync), Trigger.dev (task triggers) | Coolify container |
| **Supabase Cloud** | Auth, database (contacts, meetings, drafts, settings), RLS enforcement, Open Brain knowledge base | Next.js (client queries), Trigger.dev (server-side writes) | Supabase Cloud (managed) |
| **Trigger.dev Workers** | Scheduled meeting processing, AI contact extraction, outreach draft generation, Gmail draft creation | Supabase (read/write), Granola (data source), z.ai (AI processing), Gmail API (draft push) | Coolify container (self-hosted Trigger.dev or Trigger.dev Cloud) |
| **Granola Data Source** | Meeting transcripts, notes, attendees, action items | Trigger.dev (consumer) | External service |
| **z.ai GLM-5** | Contact card extraction from transcripts, outreach email drafting | Trigger.dev (consumer) | External API |
| **Gmail API** | Draft creation, draft listing, send capability | Next.js + Trigger.dev (consumers) | Google Cloud |

---

## Data Flow

### Flow 1: Meeting Processing Pipeline (Scheduled)

```
Trigger.dev Cron (e.g., every 2h, 8am-6pm)
    |
    v
[1] Fetch recent meetings from Granola
    |   - Option A: Granola REST API (Enterprise plan, API key per workspace)
    |   - Option B: Granola MCP Server via programmatic MCP client
    |   - Option C: Direct Granola API calls (reverse-engineered endpoints)
    |
    v
[2] For each new/updated meeting:
    |   - Deduplicate against stored meeting_ids in Supabase
    |   - Store raw transcript + meeting metadata
    |
    v
[3] AI Contact Extraction (z.ai GLM-5):
    |   - Send transcript + existing contact context
    |   - Extract: names, emails, roles, action items, topics
    |   - Classify contact category (advisor, investor, etc.)
    |   - Score relationship signals
    |
    v
[4] Upsert contacts in Supabase:
    |   - Create new contact cards or merge with existing
    |   - Link meeting to contact via junction table
    |   - Store action items, notes, relationship context
    |
    v
[5] Update dashboard indicators:
    - Recalculate "at risk" contacts
    - Flag contacts needing outreach
    - Update last_interaction timestamps
```

### Flow 2: Outreach Draft Generation (Scheduled, e.g., daily)

```
Trigger.dev Cron (e.g., 7am user-local-time)
    |
    v
[1] Query contacts due for outreach:
    |   - WHERE last_outreach + outreach_frequency_days < NOW()
    |   - Filter by user preferences and active cadences
    |
    v
[2] For each contact needing outreach:
    |   a. Gather context:
    |      - Contact card (history, notes, category)
    |      - Recent meeting transcripts involving this contact
    |      - User personality/tone profile from settings
    |      - Open Brain knowledge (supplemental context)
    |   b. Send to z.ai GLM-5:
    |      - System prompt with user personality + tone
    |      - Contact context + relationship history
    |      - Draft a personalized email
    |
    v
[3] Store draft in Supabase:
    |   - Status: pending_review
    |   - Link to contact, include AI rationale
    |
    v
[4] Create Gmail draft via Gmail API:
    |   - Use stored OAuth refresh token for this user
    |   - Create draft with To, Subject, Body
    |   - Store Gmail draft_id in Supabase for sync
    |
    v
[5] Dashboard shows pending drafts for review
```

### Flow 3: Draft Review Workflow (User-Initiated)

```
User opens Dashboard
    |
    v
[1] View pending drafts (from Supabase)
    |   - Grouped by contact, sorted by priority
    |
    v
[2] For each draft, user can:
    |   - Approve -> Mark approved, send via Gmail API
    |   - Edit + Approve -> Update draft, send via Gmail API
    |   - Reject -> Mark rejected, optionally regenerate
    |   - Snooze -> Reschedule for later
    |
    v
[3] On send:
    |   - Gmail API: drafts.send() with stored draft_id
    |   - Update contact: last_outreach = NOW()
    |   - Log interaction in contact history
    |
    v
[4] Dashboard updates indicators
```

---

## Granola Integration Strategy

**Confidence: MEDIUM** -- The right approach depends on the user's Granola plan and access level.

### Decision: Granola REST API (Primary) with MCP Fallback

| Approach | Pros | Cons | When |
|----------|------|------|------|
| **Granola REST API** | Official, documented, reliable | Enterprise-only, API key auth, rate limits (25 req/5s burst) | User has Enterprise plan |
| **MCP Server (local cache)** | Free, no API limits, rich data | Requires Granola desktop app running, Python server, local-only | Development/personal use |
| **Reverse-engineered API** | Works without Enterprise | Fragile, may break, auth complexity | Last resort |

**Recommendation**: Build the Granola adapter as a pluggable interface. Start with the REST API pattern (POST `https://api.granola.ai/v2/get-documents`, POST `https://api.granola.ai/v1/get-document-transcript`) behind an abstraction layer. If MCP becomes necessary, use the `@modelcontextprotocol/sdk` TypeScript client to connect to a Granola MCP server via stdio transport. The abstraction isolates the rest of the system from whichever data source is active.

```typescript
// Granola adapter interface
interface GranolaAdapter {
  listMeetings(since: Date, limit?: number): Promise<Meeting[]>;
  getMeetingTranscript(meetingId: string): Promise<Transcript>;
  getMeetingDetails(meetingId: string): Promise<MeetingDetails>;
}

// Two implementations behind this interface:
// - GranolaRestAdapter (API key, Enterprise plan)
// - GranolaMcpAdapter (MCP client -> local MCP server)
```

---

## z.ai GLM-5 Integration Strategy

**Confidence: HIGH** -- OpenAI-compatible API, straightforward integration.

The z.ai GLM-5 API is OpenAI-compatible at `https://api.z.ai/api/paas/v4/chat/completions`. Use the OpenAI SDK with a custom base URL:

```typescript
import OpenAI from "openai";

// Per-user client (API key stored encrypted in Supabase)
function createZaiClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  });
}
```

**Context window**: 80,000 tokens input. This is plenty for meeting transcripts (typical 5-15K tokens) plus contact context.

**Per-user API keys**: Store encrypted in Supabase. Decrypt at task execution time in Trigger.dev workers. Never expose to the client.

---

## Multi-Tenancy Architecture

### Pattern: Shared Tables with RLS (Row-Level Security)

**Confidence: HIGH** -- This is the standard Supabase pattern for SaaS applications. Schema-per-tenant is overkill for this use case.

Every table includes a `user_id` column referencing `auth.users.id`. RLS policies enforce complete data isolation.

### Database Schema

```sql
-- Core tables (all have user_id + RLS)

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  location TEXT,
  category TEXT, -- 'advisor', 'investor', 'team', 'networking', etc.
  background TEXT, -- AI-generated summary
  relationship_context TEXT, -- AI-generated relationship notes
  outreach_frequency_days INTEGER DEFAULT 30,
  last_interaction_at TIMESTAMPTZ,
  last_outreach_at TIMESTAMPTZ,
  risk_level TEXT DEFAULT 'none', -- 'none', 'low', 'medium', 'high'
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  granola_meeting_id TEXT NOT NULL, -- Dedup key
  title TEXT,
  meeting_date TIMESTAMPTZ,
  transcript TEXT,
  notes TEXT,
  granola_url TEXT, -- Link back to Granola
  raw_data JSONB, -- Full Granola response for future use
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, granola_meeting_id)
);

CREATE TABLE contact_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  action_items JSONB DEFAULT '[]',
  topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, meeting_id)
);

CREATE TABLE outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending_review', -- 'pending_review', 'approved', 'sent', 'rejected'
  gmail_draft_id TEXT, -- Synced Gmail draft ID
  ai_rationale TEXT, -- Why AI chose this content
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  personality_profile TEXT, -- Tone, style, communication preferences
  business_objectives TEXT,
  projects TEXT,
  zai_api_key_encrypted TEXT, -- Encrypted at rest
  granola_api_key_encrypted TEXT,
  processing_schedule JSONB DEFAULT '{"interval_hours": 2, "start_hour": 8, "end_hour": 18, "timezone": "America/Los_Angeles"}',
  outreach_schedule JSONB DEFAULT '{"generation_hour": 7, "timezone": "America/Los_Angeles"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  google_access_token_encrypted TEXT,
  google_refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
-- Apply to ALL tables: contacts, meetings, contact_meetings,
-- outreach_drafts, user_settings, oauth_tokens

-- Pattern: Simple user_id = auth.uid() with function wrapping for performance
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can only insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can only update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can only delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Performance: Index user_id on ALL tables
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_contact_meetings_user_id ON contact_meetings(user_id);
CREATE INDEX idx_outreach_drafts_user_id ON outreach_drafts(user_id);
CREATE INDEX idx_outreach_drafts_status ON outreach_drafts(user_id, status);
CREATE INDEX idx_contacts_risk ON contacts(user_id, risk_level);
CREATE INDEX idx_contacts_outreach_due ON contacts(user_id, last_outreach_at, outreach_frequency_days);
```

### Critical RLS Performance Optimizations

1. **Wrap `auth.uid()` in a subselect**: `(select auth.uid()) = user_id` instead of `auth.uid() = user_id`. This caches the function result instead of evaluating per-row. Over 100x improvement on large tables.

2. **Index every `user_id` column**: Without indexes, RLS triggers sequential scans. With B-tree indexes, sub-millisecond lookups.

3. **Specify `TO authenticated`**: Prevents policies from running for anonymous users entirely.

4. **Client-side filters match RLS**: Always include `.eq('user_id', userId)` in queries even though RLS enforces it. This lets Postgres use the index efficiently.

### Trigger.dev and RLS: Service Role Pattern

Trigger.dev workers operate server-side and need to read/write data for specific users. Two approaches:

**Option A (Recommended): Service role key with explicit user_id filtering**
```typescript
// In Trigger.dev tasks, use the service_role key (bypasses RLS)
// but ALWAYS filter by user_id explicitly
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypasses RLS
);

// ALWAYS scope queries to the specific user
const { data } = await supabase
  .from("contacts")
  .select("*")
  .eq("user_id", payload.userId); // Explicit user scoping
```

**Option B: Impersonate user via JWT**
More secure but more complex. Use Supabase's `auth.admin.getUserById()` to create a scoped client. Overkill for trusted server-side code.

**Recommendation**: Option A. Trigger.dev runs in your own infrastructure (Coolify). The service role key is safe in server-side environment variables. Always include `user_id` in every query as defense-in-depth.

---

## Google OAuth + Gmail Architecture

### Token Flow

```
User clicks "Sign in with Google"
    |
    v
Supabase Auth: signInWithOAuth({
  provider: 'google',
  options: {
    scopes: 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify',
    queryParams: {
      access_type: 'offline',  // CRITICAL: gets refresh token
      prompt: 'consent',       // CRITICAL: forces refresh token on first login
    }
  }
})
    |
    v
Google OAuth consent screen
    |
    v
Supabase callback with provider_token + provider_refresh_token
    |
    v
[Next.js callback handler]:
  1. Extract provider_token and provider_refresh_token from session
  2. Encrypt and store in oauth_tokens table
  3. Supabase Auth manages the Supabase session separately
```

### Critical Architecture Decision: Token Storage

Supabase Auth does NOT store or manage Google provider tokens. It only manages its own session tokens. You must:

1. Capture `provider_token` and `provider_refresh_token` in the OAuth callback
2. Encrypt and store them in your `oauth_tokens` table
3. Refresh the Google access token yourself using the refresh token when it expires (every ~1 hour)
4. Use `googleapis` npm package with the stored tokens to make Gmail API calls

```typescript
// Gmail service pattern
import { google } from "googleapis";

async function getGmailClient(userId: string) {
  const tokens = await getDecryptedTokens(userId); // From oauth_tokens table

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry.getTime(),
  });

  // Auto-refresh handler
  oauth2Client.on("tokens", async (newTokens) => {
    await updateStoredTokens(userId, newTokens);
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

// Create a draft
async function createGmailDraft(userId: string, to: string, subject: string, body: string) {
  const gmail = await getGmailClient(userId);
  const raw = createMimeMessage(to, subject, body); // base64url encoded
  return gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });
}
```

---

## Patterns to Follow

### Pattern 1: Adapter Pattern for External Services

**What**: Wrap each external service (Granola, z.ai, Gmail) behind an interface. Implement concrete adapters that can be swapped.

**When**: Any external API integration where the provider might change or have multiple access methods.

**Why**: Granola has REST API vs MCP vs local cache. z.ai might be swapped for another model. Gmail might expand to Outlook. Abstraction isolates change.

```typescript
// adapter interfaces in /lib/adapters/
interface MeetingSource {
  listMeetings(since: Date): Promise<Meeting[]>;
  getTranscript(id: string): Promise<Transcript>;
}

interface AIProvider {
  extractContacts(transcript: string, context: string): Promise<ContactExtraction[]>;
  draftEmail(contact: Contact, userProfile: UserProfile): Promise<EmailDraft>;
}

interface EmailProvider {
  createDraft(userId: string, draft: EmailDraft): Promise<DraftResult>;
  sendDraft(userId: string, draftId: string): Promise<SendResult>;
}
```

### Pattern 2: Task-per-User Execution in Trigger.dev

**What**: Scheduled cron triggers a "dispatcher" task that fans out to per-user tasks. Each user's processing is isolated.

**When**: Multi-tenant scheduled processing where each user has their own API keys, settings, and data.

```typescript
// Dispatcher: runs on cron, fans out to per-user tasks
export const meetingProcessingDispatcher = schedules.task({
  id: "meeting-processing-dispatcher",
  cron: "0 */2 * * *", // Every 2 hours
  run: async () => {
    const users = await getActiveUsers(); // Users with valid settings + API keys

    for (const user of users) {
      // Check user's processing window
      if (isWithinProcessingWindow(user.settings)) {
        await processUserMeetings.trigger(
          { userId: user.id },
          {
            queue: {
              name: `user-${user.id}-meetings`,
              concurrencyLimit: 1, // One processing job per user at a time
            },
          }
        );
      }
    }
  },
});

// Per-user task: isolated processing with user's own API keys
export const processUserMeetings = task({
  id: "process-user-meetings",
  retry: { maxAttempts: 3 },
  run: async (payload: { userId: string }) => {
    const settings = await getUserSettings(payload.userId);
    const granola = createGranolaAdapter(settings);
    const ai = createAIProvider(settings);

    const meetings = await granola.listMeetings(lastProcessedDate);
    for (const meeting of meetings) {
      // Process each meeting...
    }
  },
});
```

### Pattern 3: Prompt-as-Data for AI Processing

**What**: Store AI prompt templates in the database or config, not hardcoded. User personality profiles are injected into system prompts at runtime.

**When**: AI-generated content that must reflect user preferences (tone, style, formality).

```typescript
function buildContactExtractionPrompt(transcript: string, existingContacts: Contact[]): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a relationship intelligence assistant. Extract contacts from meeting transcripts...

Existing contacts for deduplication:
${existingContacts.map(c => `- ${c.name} (${c.email})`).join("\n")}

Return JSON with: name, email, role, topics_discussed, action_items, relationship_signals, category`
    },
    {
      role: "user",
      content: transcript
    }
  ];
}

function buildOutreachPrompt(contact: Contact, userProfile: UserProfile, context: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are drafting an email on behalf of ${userProfile.name}.

Tone: ${userProfile.personality_profile}
Current projects: ${userProfile.projects}
Business objectives: ${userProfile.business_objectives}

Write a natural, contextually-aware email that maintains the relationship.`
    },
    {
      role: "user",
      content: `Contact: ${contact.name} (${contact.category})
Last interaction: ${contact.last_interaction_at}
Relationship context: ${contact.relationship_context}
Recent meeting notes: ${context}

Draft a brief, warm outreach email.`
    }
  ];
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Provider Tokens in Supabase Auth Session

**What**: Relying on `session.provider_token` being available across requests.
**Why bad**: Supabase does not persist provider tokens. They are only available in the initial OAuth callback. If you miss capturing them, they are gone.
**Instead**: Capture `provider_token` and `provider_refresh_token` immediately in the callback handler, encrypt, and store in your own `oauth_tokens` table.

### Anti-Pattern 2: Module-Level Supabase Client in Next.js

**What**: Creating a single `supabase` client at module scope and reusing across requests.
**Why bad**: In multi-tenant apps, one user's session can leak into another user's request. This is a documented Supabase warning.
**Instead**: Always create the Supabase client inside the request handler. Use `createServerClient` from `@supabase/ssr` in each API route or Server Component.

### Anti-Pattern 3: Promise.all with Trigger.dev Waits

**What**: Wrapping `triggerAndWait` or `wait.for` in `Promise.all`.
**Why bad**: Trigger.dev does not support this pattern. It can cause silent failures or checkpoint corruption.
**Instead**: Use sequential awaits for child tasks. Use `batchTriggerAndWait` for parallel execution of the same task type.

### Anti-Pattern 4: Processing All Users in a Single Task

**What**: One cron job that iterates through all users and processes meetings/drafts sequentially.
**Why bad**: If user N's processing fails, users N+1 through end are skipped. Long-running single task with no isolation.
**Instead**: Dispatcher pattern (see Pattern 2). Fan out to per-user tasks with individual retry and concurrency control.

---

## Deployment Architecture

### Coolify Deployment Topology

```
VPS (Coolify-managed)
    |
    +-- Container: Next.js App
    |   - Port 3000
    |   - Environment variables for Supabase, Google OAuth
    |   - Node.js runtime
    |
    +-- Container: Trigger.dev (self-hosted) OR use Trigger.dev Cloud
    |   - Webapp: Dashboard + API
    |   - Worker: Task execution
    |   - Postgres (internal, for Trigger.dev state)
    |   - Redis (internal, for Trigger.dev queues)
    |
    +-- External: Supabase Cloud
        - Hosted Postgres
        - Auth service
        - No self-hosted burden
```

**Decision point**: Self-hosted Trigger.dev vs Trigger.dev Cloud.

| Factor | Self-Hosted (Coolify) | Trigger.dev Cloud |
|--------|----------------------|-------------------|
| Cost | VPS cost only | Usage-based pricing |
| Ops burden | You manage Postgres, Redis, upgrades | Zero maintenance |
| Latency to Supabase | VPS <-> Supabase Cloud (fine) | Trigger Cloud <-> Supabase Cloud (fine) |
| Complexity | Higher initial setup | npm install + config |
| Data locality | All on your VPS | Tasks execute on Trigger.dev infra |

**Recommendation**: Start with **Trigger.dev Cloud** for faster development. Migrate to self-hosted on Coolify later if costs warrant it. The task code is identical either way -- only `trigger.config.ts` changes.

---

## Suggested Build Order

Based on component dependencies, the recommended build order is:

### Phase 1: Foundation (No external API dependencies)
1. **Next.js project scaffolding** on Coolify
2. **Supabase schema + RLS policies** -- all tables, indexes, policies
3. **Google OAuth flow** -- login + token capture/storage
4. **Basic dashboard layout** -- settings page, empty contact list

*Rationale*: Everything else depends on auth and database. Get the multi-tenant foundation solid first.

### Phase 2: Data Pipeline (Granola -> Contacts)
5. **Granola adapter** -- implement the meeting source interface
6. **Meeting storage** -- ingest and deduplicate meetings
7. **AI contact extraction** -- z.ai integration for transcript processing
8. **Contact card CRUD** -- create, update, merge contacts from AI output
9. **Trigger.dev scheduled processing** -- cron dispatcher + per-user tasks

*Rationale*: This is the core value proposition. Can demo contact cards from real meetings. Depends on Phase 1 auth/database.

### Phase 3: Outreach Engine (Contacts -> Emails)
10. **Gmail API integration** -- draft creation, send, token refresh
11. **AI outreach drafting** -- z.ai email generation with user personality
12. **Draft review workflow** -- approve, edit, reject, send in dashboard
13. **Trigger.dev outreach scheduler** -- daily draft generation cron
14. **Draft sync** -- bidirectional between app and Gmail

*Rationale*: Requires contacts to exist (Phase 2) and Gmail auth (Phase 1). This is the full activation loop.

### Phase 4: Intelligence Layer (Dashboard Polish)
15. **Risk indicators** -- "at risk" contact detection, triage view
16. **Contact search/filter** -- by category, risk, last interaction
17. **Open Brain integration** -- supplemental context from knowledge base
18. **Outreach analytics** -- response tracking, cadence effectiveness
19. **Settings refinement** -- processing schedules, personality tuning

*Rationale*: Polish and intelligence features. These make the product delightful but are not blockers for core functionality.

### Dependency Graph

```
Phase 1: Foundation
  Auth + DB + Dashboard Shell
       |
       v
Phase 2: Data Pipeline          Phase 3: Outreach Engine
  Granola -> AI -> Contacts  --->  Contacts -> AI -> Gmail Drafts
       |                                |
       v                                v
Phase 4: Intelligence Layer
  Risk Scoring, Search, Open Brain, Analytics
```

Phase 3 depends on Phase 2 (needs contacts). Phase 4 depends on both Phase 2 and 3.

---

## Scalability Considerations

| Concern | 1-5 users (MVP) | 50 users | 500+ users |
|---------|-----------------|----------|------------|
| Database | Supabase Free/Pro tier, RLS sufficient | Supabase Pro, index optimization matters | Connection pooling, read replicas |
| Trigger.dev | Cloud free tier, sequential processing | Per-user queues, concurrency limits | Self-hosted on larger VPS, horizontal workers |
| z.ai API | Per-user keys, minimal rate concern | API key pooling or user-provided keys | Rate limit management, request queuing |
| Gmail API | Standard quota (250 drafts/day per user) | Fine, per-user quota | Batch API for efficiency |
| Granola | Single API key per user | Fine | Rate limit awareness (25 req/5s burst) |

For the MVP scope (likely 1-5 users initially), none of these are bottlenecks. The architecture supports growth without redesign.

---

## Sources

- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- Production patterns for multi-tenant apps
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- Official performance guide
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Provider token handling
- [Supabase Auth Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) -- Server-side client isolation
- [Granola API Docs](https://docs.granola.ai/introduction) -- Official REST API documentation
- [Granola MCP Server (proofgeist)](https://github.com/proofgeist/granola-mcp-server) -- Local cache-based MCP implementation
- [z.ai GLM-5 Documentation](https://docs.z.ai/guides/llm/glm-5) -- API reference and authentication
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- Programmatic MCP client
- [Trigger.dev + Supabase Integration](https://supabase.com/partners/integrations/triggerdotdev) -- Official partnership docs
- [Trigger.dev Self-Hosting](https://trigger.dev/docs/self-hosting/overview) -- Webapp + Worker architecture
- [Coolify Next.js Deployment](https://coolify.io/docs/applications/nextjs) -- Container deployment guide
- [Coolify Trigger.dev Template](https://github.com/essamamdani/coolify-trigger-v4) -- Community v4 setup
- [Relationship Intelligence Architecture (Introhive)](https://www.introhive.com/blog-posts/relationship-intelligence-automation/) -- Capture/Enrich/Analyze/Activate lifecycle
- [Affinity Relationship Intelligence](https://www.affinity.co/why-affinity/what-is-relationship-intelligence) -- Domain patterns
