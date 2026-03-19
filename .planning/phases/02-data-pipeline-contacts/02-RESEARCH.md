# Phase 2: Data Pipeline + Contacts - Research

**Researched:** 2026-03-19
**Domain:** Granola meeting ingestion, AI contact extraction, contact card CRUD, Trigger.dev scheduling
**Confidence:** HIGH

## Summary

Phase 2 builds the core value proposition: automatically turning Granola meeting transcripts into structured contact cards. This requires four distinct subsystems: (1) Granola API integration via reverse-engineered HTTP endpoints with WorkOS OAuth token rotation, (2) AI contact extraction using z.ai GLM-5 through the OpenAI SDK with structured output, (3) Supabase tables for contacts, meetings, and action items with RLS, and (4) a contacts UI with card-based list and detail pages.

The biggest technical challenge is Granola authentication for background jobs. Granola uses WorkOS OAuth with single-use rotating refresh tokens -- each token exchange invalidates the old token and returns a new one. This means the server must carefully persist the latest refresh token after every API call. The access token has a 1-hour TTL. The user must initiate the first token capture from the Granola desktop app, after which Trigger.dev tasks can maintain the token chain autonomously.

There are 289 pre-existing seed contact files across 8 categories that must be imported. These files follow a consistent markdown structure but have two directory layouts (flat files vs name--date subdirectories). A one-time import script must parse these MD files and insert contacts, meetings, and action items into Supabase.

**Primary recommendation:** Build in order: database schema first, seed import script second, Granola API adapter third, AI extraction fourth, contacts UI fifth. Use the admin Supabase client for all Trigger.dev tasks (bypasses RLS, always filter by user_id explicitly).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pre-scraped enriched contact data exists at `relationships/` directory (289 MD files across 8 categories: accelerators, advisors, clients, investors, networking, partners, potential-team, team)
- Each MD file follows a consistent structure: Contact Info, Background, Relationship Context (Why, What, Mutual Value), Meeting History (with Granola URLs), Action Items, Notes
- Phase 2 must import these seed files into Supabase as the initial contact base
- Contact card fields match seed MD structure: name, email, company, role, location, connected_via, category, background, relationship_context (why, what, mutual_value), status
- Meeting history is a separate linked table (contact_id -> meetings), each with date, title, summary, granola_url
- Action items are a separate linked table (contact_id -> action_items), each with text, completed flag, source_meeting_id
- Notes stored as text field on the contact record
- Outreach frequency stored as integer (days between touchpoints) on the contact record
- Granola MCP server CANNOT run server-side -- capture bearer token during interactive session, store encrypted, call HTTP API directly from Trigger.dev tasks
- Manual trigger: API route that invokes the same Trigger.dev task on-demand
- Processing schedule from `user_settings.processing_schedule` JSONB (already built in Phase 1)
- z.ai GLM5 at `api.z.ai/api/paas/v4/` -- OpenAI-compatible API
- User provides own API key (stored encrypted in `user_settings.zai_api_key_encrypted` from Phase 1)
- Deduplication by email address -- if email matches existing contact, update rather than create
- Low-confidence extractions should be flagged for user review (don't auto-create if name/email uncertain)
- Card-based layout using existing shadcn/ui Card component
- Contact list page at `/contacts` -- grid/list of contact cards with search + category filter
- Contact detail page at `/contacts/[id]` -- full card with all fields, meeting history, action items
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Scheduled Trigger.dev job fetches new Granola meetings on user-defined interval | Granola API endpoints documented; WorkOS token rotation researched; Trigger.dev schedules.task + dispatcher fan-out pattern established |
| DATA-02 | User can manually trigger meeting processing from dashboard | API route pattern from Phase 1 (GET/PUT with auth) + tasks.trigger() from backend code |
| DATA-03 | AI extracts contact information (name, email, location) from meeting transcripts | z.ai GLM-5 structured output via OpenAI SDK; contact extraction prompt pattern documented |
| DATA-04 | AI extracts relationship context (why, what, mutual value, status) from transcripts | Same AI pipeline; relationship_context JSONB field; structured output schema with nested fields |
| DATA-05 | AI extracts action items and tasks from meeting transcripts | Separate action_items table; AI returns array of action item objects; linked to both contact and meeting |
| DATA-06 | AI extracts key notes and bullet points from meetings | Notes stored as text on contact record; AI summarizes meeting context into structured notes |
| DATA-07 | System creates new contact cards or updates existing ones (dedup by email) | Email-based exact match dedup; upsert pattern; confidence scoring for low-quality extractions |
| DATA-08 | Each contact links back to original Granola meeting URL | Granola URL format: `https://app.granola.so/notes/{document_id}`; stored in meetings table |
| CONT-01 | Contact card displays: name, email, location, category, background, relationship context | Database schema with all fields; Card + Badge shadcn components; detail page layout |
| CONT-02 | Contact card includes meeting history with linked Granola URLs | contact_meetings junction table; meeting history component with linked URLs |
| CONT-03 | Contact card includes action items and tasks | action_items table linked to contact; checkbox UI for completion tracking |
| CONT-04 | Contact card includes notes/bullet points for memory jogging | Notes text field on contacts table; rendered as markdown or plain text |
| CONT-05 | User can assign contact categories (advisors, investors, etc.) | Category dropdown with 8 predefined values matching seed directories; Select component |
| CONT-06 | User can edit any field on a contact card | Inline editing with React Hook Form + Zod; PUT API route for updates |
| CONT-07 | User can set outreach frequency per contact (days between touchpoints) | outreach_frequency_days integer field; Input component with number type |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | 6.32.0 | z.ai GLM-5 client (OpenAI-compatible) | Official SDK, works with z.ai via baseURL override, supports structured output |
| @trigger.dev/sdk | 4.4.3 | Background job scheduling + execution | Already installed; task, schedules.task, queue patterns |
| @supabase/supabase-js | 2.99.2 | Database queries (admin client for Trigger.dev) | Already installed; createClient with service_role key |
| zod | 3.25.76 | Validation for API routes, AI extraction schemas | Already installed; matches existing pattern |
| react-hook-form | 7.71.2 | Contact edit forms | Already installed; matches Phase 1 settings pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date formatting for meeting history | Already installed; format meeting dates, relative time |
| lucide-react | 0.577.0 | Icons for UI (User, Mail, MapPin, etc.) | Already installed; contact card icons |
| sonner | 2.0.7 | Toast notifications for CRUD operations | Already installed; success/error feedback |

### No New Dependencies Needed
The existing stack covers all Phase 2 needs. The `openai` package is the only addition -- it provides the z.ai client.

**Installation:**
```bash
npm install openai
```

**Version verification:** openai@6.32.0 (verified 2026-03-19 via npm registry)

## Architecture Patterns

### Recommended Project Structure
```
src/
  trigger/
    meeting-dispatcher.ts    # Cron scheduler - fans out to per-user tasks
    process-user-meetings.ts # Per-user: fetch Granola + AI extract + upsert
    import-seed-contacts.ts  # One-time seed data import task
  lib/
    granola/
      client.ts              # Granola HTTP API client with token rotation
      types.ts               # Granola API response types
    ai/
      extract-contacts.ts    # AI extraction prompt + structured output
      types.ts               # Extraction result types
    validations/
      contacts.ts            # Zod schemas for contact CRUD
  app/
    (dashboard)/
      contacts/
        page.tsx             # Contact list with search + category filter
        [id]/
          page.tsx           # Contact detail with inline editing
    api/
      contacts/
        route.ts             # GET (list), POST (create)
        [id]/
          route.ts           # GET (single), PUT (update), DELETE
      meetings/
        process/
          route.ts           # POST: manual trigger for meeting processing
      granola/
        token/
          route.ts           # POST: capture and store Granola token
  components/
    contacts/
      contact-card.tsx       # Card component for list view
      contact-detail.tsx     # Full detail view with edit capability
      contact-form.tsx       # Edit form (React Hook Form + Zod)
      meeting-history.tsx    # Meeting history with Granola links
      action-items.tsx       # Action items with checkboxes
supabase/
  migrations/
    00003_create_contacts.sql
    00004_create_meetings.sql
    00005_create_contact_meetings.sql
    00006_create_action_items.sql
```

### Pattern 1: Granola API Client with Token Rotation
**What:** HTTP client that manages WorkOS OAuth token lifecycle with single-use refresh token rotation.
**When to use:** Every Granola API call from Trigger.dev tasks.
**Critical:** Each refresh token is valid for ONE use only. After exchange, the old token is immediately invalidated. Must persist the new token after every refresh.

```typescript
// src/lib/granola/client.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto/encryption";

const GRANOLA_BASE = "https://api.granola.ai";
const WORKOS_AUTH = "https://api.workos.com/user_management/authenticate";

interface GranolaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
}

export async function refreshGranolaToken(
  userId: string,
  currentRefreshToken: string,
  clientId: string
): Promise<GranolaTokens> {
  const res = await fetch(WORKOS_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`WorkOS token refresh failed: ${res.status}`);
  }

  const data = await res.json();

  // CRITICAL: Persist the new refresh token immediately
  // The old one is now INVALID
  const supabase = createAdminClient();
  await supabase
    .from("user_settings")
    .update({
      granola_refresh_token_encrypted: encrypt(data.refresh_token),
      granola_token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function getGranolaDocuments(
  accessToken: string,
  limit = 100,
  offset = 0
) {
  const res = await fetch(`${GRANOLA_BASE}/v2/get-documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit, offset, include_last_viewed_panel: true }),
  });

  if (!res.ok) throw new Error(`Granola get-documents failed: ${res.status}`);
  return res.json();
}

export async function getGranolaTranscript(
  accessToken: string,
  documentId: string
) {
  const res = await fetch(`${GRANOLA_BASE}/v1/get-document-transcript`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document_id: documentId }),
  });

  if (!res.ok) throw new Error(`Granola get-transcript failed: ${res.status}`);
  return res.json();
}
```

### Pattern 2: Trigger.dev Dispatcher Fan-Out
**What:** Scheduled cron triggers a dispatcher that fans out to per-user processing tasks with isolated queues.
**When to use:** Multi-tenant scheduled processing.

```typescript
// src/trigger/meeting-dispatcher.ts
import { schedules, task, queue } from "@trigger.dev/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const meetingDispatcher = schedules.task({
  id: "meeting-processing-dispatcher",
  cron: "0 */1 * * *", // Every hour -- filter by user schedule inside
  run: async () => {
    const supabase = createAdminClient();
    const { data: users } = await supabase
      .from("user_settings")
      .select("user_id, processing_schedule, granola_refresh_token_encrypted")
      .not("granola_refresh_token_encrypted", "is", null);

    if (!users) return;

    for (const user of users) {
      const schedule = user.processing_schedule as {
        interval_hours: number;
        start_hour: number;
        end_hour: number;
        timezone: string;
      };

      // Check if within user's processing window
      const now = new Date();
      const userHour = getHourInTimezone(now, schedule.timezone);
      if (userHour < schedule.start_hour || userHour >= schedule.end_hour) continue;

      await processUserMeetings.trigger(
        { userId: user.user_id },
        {
          queue: {
            name: `user-${user.user_id}-meetings`,
            concurrencyLimit: 1,
          },
        }
      );
    }
  },
});
```

### Pattern 3: AI Contact Extraction with Structured Output
**What:** Use OpenAI SDK pointed at z.ai with Zod-defined structured output for reliable contact extraction.
**When to use:** Processing each meeting transcript through the AI pipeline.

```typescript
// src/lib/ai/extract-contacts.ts
import OpenAI from "openai";
import { z } from "zod";

const contactExtractionSchema = z.object({
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().email().optional(),
    company: z.string().optional(),
    role: z.string().optional(),
    location: z.string().optional(),
    category: z.enum([
      "accelerators", "advisors", "clients", "investors",
      "networking", "partners", "potential-team", "team"
    ]).optional(),
    background: z.string().optional(),
    relationship_context: z.object({
      why: z.string().optional(),
      what: z.string().optional(),
      mutual_value: z.string().optional(),
    }).optional(),
    action_items: z.array(z.string()).optional(),
    notes: z.string().optional(),
    confidence: z.enum(["high", "medium", "low"]),
  })),
  meeting_summary: z.string(),
});

export async function extractContactsFromTranscript(
  apiKey: string,
  transcript: string,
  existingContacts: { name: string; email?: string }[]
) {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  });

  const response = await client.chat.completions.create({
    model: "glm-5",
    messages: [
      {
        role: "system",
        content: `You are a relationship intelligence assistant. Extract contact information from meeting transcripts.

For each person mentioned in the meeting (other than the meeting owner):
- Extract their name, email (if mentioned), company, role, location
- Determine relationship context: why they connected, what was discussed, mutual value
- Extract action items assigned to or about this person
- Write brief notes for memory jogging
- Assign a confidence level: "high" if name AND email are clear, "medium" if name is clear but email uncertain, "low" if identity is ambiguous

EXISTING CONTACTS (for deduplication -- match by email if possible):
${existingContacts.map(c => `- ${c.name}${c.email ? ` (${c.email})` : ""}`).join("\n")}

Return valid JSON matching the schema.`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No AI response content");

  return contactExtractionSchema.parse(JSON.parse(content));
}
```

### Pattern 4: Seed Data MD Parser
**What:** Parse the 289 seed markdown files into structured contact data for database import.
**When to use:** One-time seed import or migration script.

```typescript
// Key parsing logic for seed MD files
// Two directory layouts exist:
// 1. Flat: relationships/advisors/2026-02-03-dave-brown.md
// 2. Nested: relationships/investors/ahan-rajgor--2025-07-03/2025-07-03-ahan-rajgor.md

// MD structure to parse:
// # Name
// > **Category:** X
// > **Last Contact:** date
// > **Status:** Active|Not Pursuing
//
// ## Contact Info
// - **Email:** x@y.com (or - Email: x@y.com)
// - **Company:** X
// - **Role:** X
// - **Location:** X
// - **Connected via:** X
//
// ## Background
// [text]
//
// ## Relationship Context
// ### Why We Connected  (or inline paragraph)
// ### What Was Discussed
// ### Mutual Value
//
// ## Meeting History
// ### date -- title
// [summary]
// [Granola Notes](url)
//
// ## Action Items (or ## Action Items & Next Steps)
// - [ ] item text
// - item text (some without checkboxes)
//
// ## Notes
// [text]
```

### Anti-Patterns to Avoid
- **Reusing Granola refresh tokens:** Each token is single-use. Reusing a consumed token permanently breaks the token chain and requires the user to re-authenticate from the Granola desktop app.
- **Processing all users in one task:** A single Trigger.dev task that loops through users. If user N fails, N+1 through end are skipped. Use dispatcher fan-out instead.
- **Auto-creating low-confidence contacts:** AI extractions with only a first name and no email should be flagged for review, not auto-inserted. This prevents phantom contacts that pollute the database.
- **Calling Granola API without checking token expiry:** Access tokens expire after 1 hour. Always check expiry before making API calls; refresh proactively.
- **Storing transcripts in the contacts table:** Transcripts can be 50KB+. Store in a separate meetings table; summarize key points into the contact's notes field.
- **Using Promise.all with triggerAndWait:** Trigger.dev does not support this pattern. Use sequential awaits or batchTriggerAndWait.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAI-compatible AI client | Custom HTTP fetch wrapper for z.ai | `openai` npm package with baseURL override | Handles streaming, retries, types, structured output; z.ai is explicitly compatible |
| Markdown parsing for seed files | Full markdown AST parser | Simple regex-based section extraction | Seed files follow a rigid template; regex is sufficient and avoids heavy dependencies |
| JSON structured output from AI | Manual JSON extraction from free-text | OpenAI SDK `response_format: { type: "json_object" }` + Zod validation | Enforces JSON output; Zod validates and types the result |
| Background job scheduling | Custom cron implementation | Trigger.dev `schedules.task` with cron expression | Built-in checkpointing, retries, monitoring, per-user queues |
| Token encryption | Custom crypto implementation | Existing `encrypt()`/`decrypt()` from `src/lib/crypto/encryption.ts` | Already built in Phase 1; AES-256-GCM with proper IV handling |

**Key insight:** The OpenAI SDK with z.ai's baseURL is the critical "don't hand-roll" item. Building a custom HTTP client for the AI API would mean reimplementing streaming, error handling, token counting, and structured output support. The OpenAI SDK handles all of this out of the box.

## Common Pitfalls

### Pitfall 1: Granola Refresh Token Consumed Without Persisting New One
**What goes wrong:** The token exchange returns a new access_token AND a new refresh_token. If you consume the old refresh_token but fail to persist the new one (crash, error, race condition), the token chain is permanently broken. The user must re-authenticate from the Granola desktop app.
**Why it happens:** Developers treat refresh tokens as stable/reusable (like Google OAuth). Granola/WorkOS uses single-use rotation.
**How to avoid:** Persist the new refresh_token to the database IMMEDIATELY after the token exchange response, before making any Granola API calls. Use a transaction or atomic update. Log token rotation events for debugging.
**Warning signs:** Users reporting "Granola disconnected" after it was working. Token refresh errors with "invalid_grant" or 401.

### Pitfall 2: Seed Data Import Missing Structural Variations
**What goes wrong:** Parser works for the first few test files but fails on others. The 289 seed files have two directory layouts and minor formatting variations (e.g., `- Email:` vs `- **Email:**`, checkbox format `- [ ]` vs `- ` for action items, inline relationship context vs subsection format).
**Why it happens:** Developer writes parser against one reference file and assumes all follow the exact same format.
**How to avoid:** Test parser against files from each category (advisors, investors, networking, partners have different patterns). Handle both bold and non-bold contact info fields. Handle both checkbox and plain list action items.
**Warning signs:** Import reporting fewer contacts than expected (289 total across all categories).

### Pitfall 3: AI Extraction Creates Duplicate Contacts for Same Person
**What goes wrong:** "John Smith" from Meeting A and "John" from Meeting B are created as separate contacts because the email wasn't mentioned in Meeting B.
**Why it happens:** Email-only deduplication misses name-only mentions. The AI extracts what it sees in each transcript independently.
**How to avoid:** Pass existing contacts to the AI prompt so it can match by name+context. Only auto-create contacts with "high" confidence (has email). Flag "medium"/"low" confidence extractions for user review. For v1, email-based dedup is correct -- but the AI prompt should explicitly try to match against existing contact names.
**Warning signs:** Contact count growing faster than expected. Users seeing partial/duplicate entries.

### Pitfall 4: Granola API Rate Limits on Initial Sync
**What goes wrong:** First sync for a user with months of meeting history hits the 25 req/5s burst limit or the 5 req/s sustained limit, causing 429 errors and partial data.
**Why it happens:** Initial sync tries to fetch all historical meetings + transcripts at once.
**How to avoid:** Paginate document fetches (limit=100 per request). Add delay between transcript fetches (200ms minimum). Limit initial sync to recent 90 days. Backfill older data incrementally in subsequent runs. Implement exponential backoff on 429 responses.
**Warning signs:** 429 errors in Trigger.dev logs. Partial meeting imports. Users with long history seeing incomplete data.

### Pitfall 5: Missing RLS on New Tables Exposes Contact Data
**What goes wrong:** New contacts/meetings/action_items tables created without RLS, exposing all users' relationship data to any authenticated user.
**Why it happens:** Developer creates migration, forgets the RLS block that Phase 1 established as mandatory.
**How to avoid:** Follow the exact migration template from Phase 1 (`00001_create_user_settings.sql`): CREATE TABLE, ENABLE RLS, 4 CRUD policies with `(select auth.uid())`, index on user_id. Every table. No exceptions.
**Warning signs:** Queries returning data from other users. Missing `ENABLE ROW LEVEL SECURITY` in migration files.

## Code Examples

### Database Schema: Contacts Table
```sql
-- Source: Architecture research + CONTEXT.md decisions
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  location TEXT,
  connected_via TEXT,
  category TEXT CHECK (category IN (
    'accelerators', 'advisors', 'clients', 'investors',
    'networking', 'partners', 'potential-team', 'team'
  )),
  background TEXT,
  relationship_context JSONB DEFAULT '{}',
  -- relationship_context: { why: string, what: string, mutual_value: string }
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'not_pursuing', 'dormant')),
  outreach_frequency_days INTEGER DEFAULT 30,
  last_interaction_at TIMESTAMPTZ,
  notes TEXT,
  ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email) -- Dedup key: one contact per email per user
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ... standard 4 CRUD policies with (select auth.uid()) = user_id ...
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_user_email ON contacts(user_id, email);
CREATE INDEX idx_contacts_user_category ON contacts(user_id, category);
```

### Database Schema: Meetings Table
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granola_document_id TEXT, -- Granola's document ID for dedup
  title TEXT,
  meeting_date TIMESTAMPTZ,
  summary TEXT,
  transcript TEXT, -- Full transcript text
  granola_url TEXT, -- https://app.granola.so/notes/{document_id}
  raw_data JSONB, -- Full Granola API response for future use
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, granola_document_id)
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
-- ... standard 4 CRUD policies ...
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_granola_doc ON meetings(user_id, granola_document_id);
```

### Database Schema: Contact Meetings (Junction)
```sql
CREATE TABLE contact_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, meeting_id)
);

ALTER TABLE contact_meetings ENABLE ROW LEVEL SECURITY;
-- ... standard 4 CRUD policies ...
CREATE INDEX idx_contact_meetings_user ON contact_meetings(user_id);
CREATE INDEX idx_contact_meetings_contact ON contact_meetings(contact_id);
```

### Database Schema: Action Items
```sql
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
-- ... standard 4 CRUD policies ...
CREATE INDEX idx_action_items_user ON action_items(user_id);
CREATE INDEX idx_action_items_contact ON action_items(contact_id);
```

### User Settings Migration Update
```sql
-- Add Granola token fields to user_settings
ALTER TABLE user_settings
  ADD COLUMN granola_refresh_token_encrypted TEXT,
  ADD COLUMN granola_client_id TEXT,
  ADD COLUMN granola_token_expiry TIMESTAMPTZ,
  ADD COLUMN granola_token_status TEXT DEFAULT 'disconnected'
    CHECK (granola_token_status IN ('active', 'expired', 'disconnected'));
```

### Contact CRUD API Route
```typescript
// src/app/api/contacts/route.ts -- follows Phase 1 pattern
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("contacts")
    .select("*, action_items(id, text, completed)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
```

### Manual Meeting Processing Trigger
```typescript
// src/app/api/meetings/process/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tasks } from "@trigger.dev/sdk";
import type { processUserMeetings } from "@/trigger/process-user-meetings";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const handle = await tasks.trigger<typeof processUserMeetings>(
    "process-user-meetings",
    { userId: user.id }
  );

  return NextResponse.json({ runId: handle.id, status: "triggered" });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Granola MCP in Trigger.dev | Direct HTTP API + WorkOS token rotation | Phase 1 spike confirmed MCP cannot run server-side | Must capture bearer token from desktop app; rotate single-use refresh tokens |
| `client.defineJob()` | `task()` / `schedules.task()` from `@trigger.dev/sdk` | Trigger.dev v4 GA (2025) | v3 deprecated; never use old client.defineJob pattern |
| Manual contact data entry | AI extraction from meeting transcripts | This phase | Core value proposition; z.ai GLM-5 via OpenAI SDK |
| OpenAI Responses API | OpenAI Chat Completions API with json_object format | Still transitioning | z.ai compatibility is with Chat Completions; use `response_format: { type: "json_object" }` |

**Deprecated/outdated:**
- Trigger.dev v3 `client.defineJob` -- use `task()` from `@trigger.dev/sdk`
- Granola MCP for server-side -- use direct HTTP API calls
- OpenAI `zodResponseFormat` -- z.ai may not support native schema enforcement; use `json_object` + manual Zod validation

## Granola API Reference

### Endpoints (Reverse-Engineered)
| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|-------------|
| `https://api.workos.com/user_management/authenticate` | POST | Token refresh (single-use rotation) | `{ client_id, grant_type: "refresh_token", refresh_token }` |
| `https://api.granola.ai/v2/get-documents` | POST | List meetings | `{ limit: 100, offset: 0, include_last_viewed_panel: true }` |
| `https://api.granola.ai/v1/get-document-transcript` | POST | Get meeting transcript | `{ document_id: "string" }` |
| `https://api.granola.ai/v1/get-documents-batch` | POST | Get specific documents (including shared) | `{ document_ids: ["id1", "id2"] }` |

### Authentication
- Bearer token in `Authorization` header
- Access token TTL: 1 hour (3600 seconds)
- Refresh tokens: **SINGLE USE** -- each exchange invalidates old, returns new
- Rate limits: 25 req/5s burst, 5 req/s sustained, 429 on exceeded

### Transcript Response Format
```json
[
  {
    "source": "microphone|system",
    "text": "transcribed text segment",
    "start_timestamp": "2026-03-19T10:00:00Z",
    "end_timestamp": "2026-03-19T10:00:15Z",
    "confidence": 0.95
  }
]
```

### Document Response (from get-documents)
```json
{
  "docs": [
    {
      "id": "document_id",
      "title": "Meeting Title",
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "last_viewed_panel": {
        "content": "ProseMirror JSON content (meeting notes/summary)"
      }
    }
  ]
}
```

## Seed Data Analysis

### File Counts by Category
| Category | Count | Directory Pattern |
|----------|-------|-------------------|
| advisors | 69 | Mixed: flat files + name--date subdirs |
| investors | 33 | name--date subdirectories |
| networking | 57 | name--date subdirectories |
| partners | 76 | Flat files (date-name.md) |
| potential-team | 45 | name--date subdirectories |
| clients | 7 | name--date subdirectories |
| team | 2 | name--date subdirectories |
| accelerators | 0 | Empty directory |
| **Total** | **289** | |

### Structural Variations
- **Contact Info formatting:** Both `- **Email:** x` (bold) and `- Email: x` (plain)
- **Relationship Context:** Some have `### Why We Connected` / `### What Was Discussed` / `### Mutual Value` subsections; others have inline paragraph
- **Meeting History:** Some have `### date -- title` subsections with Granola links; others have `- N meetings in month year` with single link
- **Action Items:** Both `- [ ] task text` (checkbox) and `- task text` (plain list)
- **Status values:** "Active", "Not Pursuing", "Nurturing" observed

### Granola URL Format
All meeting links follow: `https://app.granola.so/notes/{short_id_or_full_uuid}`
- Short: `https://app.granola.so/notes/2ffabd21`
- Full UUID: `https://app.granola.so/notes/6ca83564-b3c7-4e5c-ad87-a0549d63c434`

## Open Questions

1. **Granola WorkOS client_id**
   - What we know: Token refresh requires a `client_id` parameter for WorkOS. This is Granola's application client_id, not a user credential.
   - What's unclear: The exact client_id value. It may be extracted from the Granola desktop app's local storage or configuration.
   - Recommendation: During the Granola token capture flow, extract and store both the refresh_token AND the client_id. The user's browser dev tools or the Granola app's local storage (`~/Library/Application Support/Granola/`) contain both.

2. **z.ai GLM-5 structured output support**
   - What we know: z.ai docs say it supports structured output and is OpenAI-compatible. OpenAI's `response_format: { type: "json_object" }` is the safest format.
   - What's unclear: Whether z.ai supports OpenAI's newer `json_schema` mode or Zod-based `zodResponseFormat`.
   - Recommendation: Use `{ type: "json_object" }` with explicit JSON instructions in the prompt + Zod validation of the response. This is the most broadly compatible approach.

3. **Seed data ownership**
   - What we know: 289 contact files exist. They belong to the project owner (single user for MVP).
   - What's unclear: Which user_id to assign during import.
   - Recommendation: The import script should accept a user_id parameter. Run it for the authenticated user via an API route or Trigger.dev task triggered from the dashboard.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (exists from Phase 1) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Dispatcher fans out to per-user tasks based on schedule | unit | `npx vitest run src/__tests__/trigger/meeting-dispatcher.test.ts -t "dispatcher" --reporter=verbose` | Wave 0 |
| DATA-02 | Manual trigger API route invokes processing task | unit | `npx vitest run src/__tests__/api/meetings-process.test.ts -t "manual trigger" --reporter=verbose` | Wave 0 |
| DATA-03 | AI extracts name, email, location from transcript | unit | `npx vitest run src/__tests__/ai/extract-contacts.test.ts -t "contact info" --reporter=verbose` | Wave 0 |
| DATA-04 | AI extracts relationship context from transcript | unit | `npx vitest run src/__tests__/ai/extract-contacts.test.ts -t "relationship" --reporter=verbose` | Wave 0 |
| DATA-05 | AI extracts action items from transcript | unit | `npx vitest run src/__tests__/ai/extract-contacts.test.ts -t "action items" --reporter=verbose` | Wave 0 |
| DATA-06 | AI extracts notes from transcript | unit | `npx vitest run src/__tests__/ai/extract-contacts.test.ts -t "notes" --reporter=verbose` | Wave 0 |
| DATA-07 | Upsert creates new or updates existing by email | unit | `npx vitest run src/__tests__/contacts/dedup.test.ts -t "dedup" --reporter=verbose` | Wave 0 |
| DATA-08 | Meeting links back to Granola URL | unit | `npx vitest run src/__tests__/contacts/meetings.test.ts -t "granola url" --reporter=verbose` | Wave 0 |
| CONT-01 | Contact card displays all required fields | unit | `npx vitest run src/__tests__/components/contact-card.test.tsx -t "display" --reporter=verbose` | Wave 0 |
| CONT-02 | Meeting history with Granola links | unit | `npx vitest run src/__tests__/components/meeting-history.test.tsx -t "history" --reporter=verbose` | Wave 0 |
| CONT-03 | Action items display with checkboxes | unit | `npx vitest run src/__tests__/components/action-items.test.tsx -t "items" --reporter=verbose` | Wave 0 |
| CONT-04 | Notes display on contact card | unit | `npx vitest run src/__tests__/components/contact-card.test.tsx -t "notes" --reporter=verbose` | Wave 0 |
| CONT-05 | Category assignment via dropdown | unit | `npx vitest run src/__tests__/components/contact-form.test.tsx -t "category" --reporter=verbose` | Wave 0 |
| CONT-06 | Edit any field on contact card | unit | `npx vitest run src/__tests__/components/contact-form.test.tsx -t "edit" --reporter=verbose` | Wave 0 |
| CONT-07 | Outreach frequency setting | unit | `npx vitest run src/__tests__/components/contact-form.test.tsx -t "frequency" --reporter=verbose` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/trigger/meeting-dispatcher.test.ts` -- covers DATA-01
- [ ] `src/__tests__/api/meetings-process.test.ts` -- covers DATA-02
- [ ] `src/__tests__/ai/extract-contacts.test.ts` -- covers DATA-03, DATA-04, DATA-05, DATA-06
- [ ] `src/__tests__/contacts/dedup.test.ts` -- covers DATA-07
- [ ] `src/__tests__/contacts/meetings.test.ts` -- covers DATA-08
- [ ] `src/__tests__/components/contact-card.test.tsx` -- covers CONT-01, CONT-04
- [ ] `src/__tests__/components/meeting-history.test.tsx` -- covers CONT-02
- [ ] `src/__tests__/components/action-items.test.tsx` -- covers CONT-03
- [ ] `src/__tests__/components/contact-form.test.tsx` -- covers CONT-05, CONT-06, CONT-07
- [ ] `src/__tests__/seed/md-parser.test.ts` -- covers seed data import (not a requirement but critical)
- [ ] `src/__tests__/granola/client.test.ts` -- covers Granola API client + token rotation

## Sources

### Primary (HIGH confidence)
- Phase 1 codebase -- `src/lib/supabase/admin.ts`, `src/lib/crypto/encryption.ts`, `src/lib/validations/settings.ts`, `supabase/migrations/00001_create_user_settings.sql` -- Established patterns for admin client, encryption, validation, RLS migrations
- `trigger.config.ts` -- Verified Trigger.dev v4 configuration with project ref, dirs, maxDuration
- `package.json` -- Verified all dependency versions: @trigger.dev/sdk@4.4.3, @supabase/supabase-js@2.99.2, zod@3.25.76, react-hook-form@7.71.2
- `relationships/advisors/2026-02-03-dave-brown.md` -- Reference seed contact structure (full format)
- `relationships/networking/daniel-chadash--2025-07-07/2025-07-07-daniel-chadash.md` -- Compact seed contact structure (networking pattern)
- `relationships/partners/2026-03-17-nini-studycrowd.md` -- Partner seed contact structure
- npm registry -- Verified openai@6.32.0 (2026-03-19)

### Secondary (MEDIUM confidence)
- [Granola reverse-engineered API (getprobo)](https://github.com/getprobo/reverse-engineering-granola-api) -- Full endpoint documentation, WorkOS auth flow, token rotation behavior
- [granola-cli implementation](https://magarcia.io/reverse-engineered-meeting-notes-into-terminal/) -- Practical token storage, API endpoint usage, transcript format
- [Granola API Docs](https://docs.granola.ai/introduction) -- Rate limits (25 req/5s burst, 5 req/s sustained), Enterprise API key requirement
- [z.ai GLM-5 Documentation](https://docs.z.ai/guides/llm/glm-5) -- API endpoint, OpenAI compatibility, 205K context window
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) -- response_format json_object pattern
- [Joseph Thacker - Reverse Engineering Granola](https://josephthacker.com/hacking/2025/05/08/reverse-engineering-granola-notes.html) -- Token extraction from local app storage

### Tertiary (LOW confidence)
- z.ai `json_schema` support -- Stated as "OpenAI-compatible" but exact structured output schema enforcement not verified; recommend using `json_object` + Zod validation as safe fallback
- Granola `client_id` value -- Must be extracted from desktop app; not documented publicly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All packages verified against npm registry; existing codebase patterns clear
- Architecture: HIGH -- Dispatcher fan-out, admin client, RLS patterns all proven in Phase 1; Granola API endpoints well-documented by reverse-engineering community
- Pitfalls: HIGH -- Token rotation, seed data variations, dedup edge cases all verified against multiple sources
- Granola integration: MEDIUM -- API endpoints are reverse-engineered (not official REST API); WorkOS token rotation is documented but fragile
- AI extraction quality: MEDIUM -- z.ai GLM-5 OpenAI compatibility confirmed; structured output approach standard; actual extraction quality depends on prompt engineering with real data

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days -- Granola API may change without notice as it is reverse-engineered)
